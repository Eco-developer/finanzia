import {
  Injectable,
  Inject,
  Optional,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../domain/repositories/user.repository.interface";
import {
  ISessionRepository,
  SESSION_REPOSITORY,
} from "../../domain/repositories/session.repository.interface";
import {
  ISessionNotifierPort,
  SESSION_NOTIFIER_PORT,
} from "../ports/session-notifier.port";
import { IHashingService, HASHING_SERVICE } from "../ports/hashing.port";
import { IEmailPort, EMAIL_PORT } from "../ports/email.port";
import { RegisterDto } from "../../../presentation/dtos/auth/register.dto";
import { LoginDto } from "../../../presentation/dtos/auth/login.dto";
import {
  UserResponseDto,
  AuthResponseDto,
} from "../../../presentation/dtos/auth/user-response.dto";
import { UserAlreadyExistsException } from "../../domain/exceptions/user-already-exists.exception";
import { InvalidCredentialsException } from "../../domain/exceptions/invalid-credentials.exception";
import { UserNotFoundException } from "../../domain/exceptions/user-not-found.exception";
import { EmailNotVerifiedException } from "../../domain/exceptions/email-not-verified.exception";
import { InvalidVerificationTokenException } from "../../domain/exceptions/invalid-verification-token.exception";
import { UserEntity } from "../../domain/entities/user.entity";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(HASHING_SERVICE)
    private readonly hashingService: IHashingService,
    @Inject(EMAIL_PORT)
    private readonly emailService: IEmailPort,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository,
    @Optional()
    @Inject(SESSION_NOTIFIER_PORT)
    private readonly sessionNotifier?: ISessionNotifierPort,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new UserAlreadyExistsException(dto.email);
    }

    const passwordHash = await this.hashingService.hash(dto.password);

    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      defaultCurrency: dto.defaultCurrency || "EUR",
    });

    // Generar token de verificación criptográfico con caducidad a 24 horas
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userRepository.saveVerificationToken(
      user.id,
      verificationToken,
      expiresAt,
    );

    // Enviar correo de bienvenida con botón de verificación
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

    await this.emailService.sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      verificationLink,
    });

    return {
      user: this.toResponseDto(user),
      requiresVerification: true,
    };
  }

  async login(
    dto: LoginDto,
    metadata?: { ipAddress?: string; deviceInfo?: string },
  ): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isMatch = await this.hashingService.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isMatch) {
      throw new InvalidCredentialsException();
    }

    // Si el correo no ha sido verificado, bloquear acceso y redirigir a verificación
    if (!user.emailVerified) {
      throw new EmailNotVerifiedException(user.email);
    }

    const token = this.generateToken(user);
    const refreshToken = await this.createSessionAndRefreshToken(
      user.id,
      metadata,
    );

    return {
      user: this.toResponseDto(user),
      token,
      refreshToken,
    };
  }

  async verifyEmail(token: string): Promise<{
    success: boolean;
    message: string;
    user: UserResponseDto;
    token: string;
    refreshToken: string;
  }> {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) {
      throw new InvalidVerificationTokenException();
    }

    const updatedUser = await this.userRepository.updateEmailVerified(
      user.id,
      true,
    );

    const sessionToken = this.generateToken(updatedUser);
    const refreshToken = await this.createSessionAndRefreshToken(
      updatedUser.id,
    );

    return {
      success: true,
      message: "Correo electrónico verificado con éxito.",
      user: this.toResponseDto(updatedUser),
      token: sessionToken,
      refreshToken,
    };
  }

  async resendVerification(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundException(email);
    }

    if (user.emailVerified) {
      return {
        success: true,
        message:
          "Este correo electrónico ya está verificado. Puedes iniciar sesión.",
      };
    }

    // Generar nuevo token y extender caducidad a 24 horas
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userRepository.saveVerificationToken(
      user.id,
      verificationToken,
      expiresAt,
    );

    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

    await this.emailService.sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      verificationLink,
    });

    return {
      success: true,
      message: "Se ha reenviado un nuevo correo de verificación.",
    };
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    const genericSuccessMessage =
      "Si tu correo electrónico coincide con una cuenta registrada, te hemos enviado un enlace de recuperación.";

    // OWASP Anti-Enumeración: Si el correo no existe, responder 200 neutro sin enviar correo
    if (!user) {
      this.logger.warn(
        `[PasswordReset] Solicitud para correo no registrado: ${normalizedEmail}`,
      );
      return {
        success: true,
        message: genericSuccessMessage,
      };
    }

    // Generar token JWT temporal con expiración de 30 minutos
    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        type: "password_reset",
        tokenVersion: user.tokenVersion,
      },
      { expiresIn: "30m" },
    );

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.userRepository.savePasswordResetToken(
      user.id,
      resetToken,
      expiresAt,
    );

    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetLink,
      expiresInMinutes: 30,
    });

    return {
      success: true,
      message: genericSuccessMessage,
    };
  }

  async verifyResetToken(
    token: string,
  ): Promise<{ valid: boolean; email: string }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException(
        "El enlace de recuperación es inválido o ha caducado.",
      );
    }

    const user = await this.userRepository.findByPasswordResetToken(token);
    if (!user || user.id !== payload.sub) {
      throw new UnauthorizedException(
        "El enlace de recuperación es inválido, ha caducado o ya fue utilizado.",
      );
    }

    return {
      valid: true,
      email: user.email,
    };
  }

  async resetPassword(
    userId: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }

    const passwordHash = await this.hashingService.hash(newPassword);
    await this.userRepository.updatePasswordAndRevokeSessions(
      user.id,
      passwordHash,
    );
    await this.sessionRepository.revokeAllForUser(user.id);
    if (this.sessionNotifier) {
      await this.sessionNotifier.notifyAllSessionsRevoked(user.id);
    }

    return {
      success: true,
      message: "Tu contraseña se ha cambiado exitosamente.",
    };
  }

  async refreshToken(
    oldRefreshToken: string,
    metadata?: { ipAddress?: string; deviceInfo?: string },
  ): Promise<AuthResponseDto> {
    if (!oldRefreshToken) {
      throw new UnauthorizedException("Token de refresco requerido.");
    }

    const oldHash = this.hashToken(oldRefreshToken);
    const session = await this.sessionRepository.findByTokenHash(oldHash);

    if (!session) {
      throw new UnauthorizedException("Sesión no encontrada o token inválido.");
    }

    // Detección de reúso / robo de token: Si ya fue reemplazado o revocado previamente
    if (session.isRevoked || session.replacedByTokenHash) {
      this.logger.error(
        `[Security Alert] Intento de reutilización de token revocado para el usuario ${session.userId}. Revocando todas las sesiones activas.`,
      );
      await this.sessionRepository.revokeAllForUser(session.userId);
      await this.userRepository.incrementTokenVersion(session.userId);
      if (this.sessionNotifier) {
        await this.sessionNotifier.notifyAllSessionsRevoked(session.userId);
      }
      throw new UnauthorizedException(
        "Intento de acceso sospechoso detectado. Todas las sesiones activas han sido cerradas por seguridad.",
      );
    }

    if (session.isExpired()) {
      await this.sessionRepository.revokeByTokenHash(oldHash);
      throw new UnauthorizedException(
        "La sesión ha caducado. Por favor, inicia sesión de nuevo.",
      );
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException(
        "Usuario asociado a la sesión no encontrado.",
      );
    }

    // Generar nuevo par de tokens (Access Token 15m + Refresh Token rotado 7d)
    const newAccessToken = this.generateToken(user);
    const newRefreshToken = crypto.randomBytes(32).toString("hex");
    const newHash = this.hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.sessionRepository.replaceToken(oldHash, {
      userId: user.id,
      tokenHash: newHash,
      deviceInfo: metadata?.deviceInfo ?? session.deviceInfo,
      ipAddress: metadata?.ipAddress ?? session.ipAddress,
      expiresAt: newExpiresAt,
    });

    return {
      user: this.toResponseDto(user),
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(
    refreshToken?: string,
    userId?: string,
  ): Promise<{ success: boolean; message: string }> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.sessionRepository.revokeByTokenHash(tokenHash);
    }

    if (userId && this.sessionNotifier) {
      await this.sessionNotifier.notifySessionRevoked(userId);
    }

    return {
      success: true,
      message: "Sesión finalizada correctamente",
    };
  }

  async logoutAll(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.sessionRepository.revokeAllForUser(userId);
    await this.userRepository.incrementTokenVersion(userId);

    if (this.sessionNotifier) {
      await this.sessionNotifier.notifyAllSessionsRevoked(userId);
    }

    return {
      success: true,
      message: "Todas las sesiones activas han sido finalizadas",
    };
  }

  private async createSessionAndRefreshToken(
    userId: string,
    metadata?: { ipAddress?: string; deviceInfo?: string },
  ): Promise<string> {
    const rawRefreshToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.sessionRepository.create({
      userId,
      tokenHash,
      deviceInfo: metadata?.deviceInfo,
      ipAddress: metadata?.ipAddress,
      expiresAt,
    });

    return rawRefreshToken;
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }
    return this.toResponseDto(user);
  }

  private generateToken(user: UserEntity): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    });
  }

  private toResponseDto(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      defaultCurrency: user.defaultCurrency,
      emailVerified: user.emailVerified,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    };
  }
}
