import {
  Injectable,
  Inject,
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

  async login(dto: LoginDto): Promise<AuthResponseDto> {
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

    return {
      user: this.toResponseDto(user),
      token,
    };
  }

  async verifyEmail(token: string): Promise<{
    success: boolean;
    message: string;
    user: UserResponseDto;
    token: string;
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

    return {
      success: true,
      message: "Correo electrónico verificado con éxito.",
      user: this.toResponseDto(updatedUser),
      token: sessionToken,
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

    return {
      success: true,
      message: "Tu contraseña se ha cambiado exitosamente.",
    };
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
