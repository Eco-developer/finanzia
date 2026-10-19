import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { AuthService } from "../../core/application/auth/auth.service";
import { RegisterDto } from "../dtos/auth/register.dto";
import { LoginDto } from "../dtos/auth/login.dto";
import {
  VerifyEmailDto,
  ResendVerificationDto,
} from "../dtos/auth/verify-email.dto";
import { ForgotPasswordDto } from "../dtos/auth/forgot-password.dto";
import { ResetPasswordDto } from "../dtos/auth/reset-password.dto";
import {
  UserResponseDto,
  AuthResponseDto,
} from "../dtos/auth/user-response.dto";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

const COOKIE_NAME = "jwt_token";
const REFRESH_COOKIE_NAME = "refresh_token";
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Registrar nuevo usuario",
    description:
      "Crea un nuevo usuario en la plataforma, cifra la contraseña con Argon2id y envía un correo de verificación.",
  })
  @ApiResponse({
    status: 201,
    description:
      "Usuario registrado exitosamente (requiere verificación de correo)",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Datos de validación incorrectos o contraseña débil",
  })
  @ApiResponse({
    status: 409,
    description: "El correo electrónico ya se encuentra registrado",
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(dto);
    if (result.token) {
      this.setAuthCookies(response, result.token, result.refreshToken);
    }

    return {
      success: true,
      data: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      requiresVerification: result.requiresVerification,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Verificar correo electrónico",
    description:
      "Valida el token enviado por correo electrónico y activa la cuenta del usuario.",
  })
  @ApiResponse({
    status: 200,
    description: "Correo verificado exitosamente",
  })
  @ApiResponse({
    status: 400,
    description: "Token inválido o expirado",
  })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyEmail(dto.token);
    this.setAuthCookies(response, result.token, result.refreshToken);

    return {
      success: true,
      data: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      message: result.message,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Reenviar correo de verificación",
    description:
      "Genera un nuevo token de verificación y lo envía al correo del usuario.",
  })
  @ApiResponse({
    status: 200,
    description: "Correo de verificación reenviado exitosamente",
  })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    const result = await this.authService.resendVerification(dto.email);
    return {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Iniciar sesión de usuario",
    description:
      "Verifica las credenciales del usuario con Argon2id, emite Access Token (15m) y Refresh Token rotativo (7d) y establece cookies HttpOnly.",
  })
  @ApiResponse({
    status: 200,
    description: "Inicio de sesión exitoso",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Credenciales inválidas",
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const metadata = {
      ipAddress: req.ip,
      deviceInfo: req.headers["user-agent"],
    };
    const result = await this.authService.login(dto, metadata);
    this.setAuthCookies(response, result.token!, result.refreshToken);

    return {
      success: true,
      data: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth("refresh_token")
  @ApiOperation({
    summary: "Renovar tokens de sesión (Refresh Token Rotation)",
    description:
      "Renueva el Access Token y rota el Refresh Token (RTR). Lee la cookie HttpOnly 'refresh_token' o el valor provisto en el cuerpo.",
  })
  @ApiResponse({
    status: 200,
    description: "Tokens renovados exitosamente",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Token de refresco inválido, caducado o reutilizado",
  })
  async refresh(
    @Req() req: Request,
    @Body("refreshToken") bodyToken: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || bodyToken;
    const metadata = {
      ipAddress: req.ip,
      deviceInfo: req.headers["user-agent"],
    };

    const result = await this.authService.refreshToken(refreshToken, metadata);
    this.setAuthCookies(response, result.token!, result.refreshToken);

    return {
      success: true,
      data: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cerrar sesión",
    description:
      "Invalida la sesión actual en base de datos, emite notificación WebSocket y elimina las cookies seguras de autenticación.",
  })
  @ApiResponse({
    status: 200,
    description: "Sesión finalizada correctamente",
  })
  async logout(
    @Req() req: Request,
    @Body("refreshToken") bodyToken: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || bodyToken;
    const userId = (req as any).user?.id;

    await this.authService.logout(refreshToken, userId);
    this.clearAuthCookies(response);

    return {
      success: true,
      message: "Sesión finalizada correctamente",
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("logout-all")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("jwt_token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cerrar sesión en todos los dispositivos",
    description:
      "Invalida todas las sesiones activas del usuario, incrementa tokenVersion y emite difusión WebSocket de cierre global.",
  })
  @ApiResponse({
    status: 200,
    description: "Todas las sesiones finalizadas correctamente",
  })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logoutAll(user.id);
    this.clearAuthCookies(response);

    return {
      success: true,
      message: result.message,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("jwt_token")
  @ApiOperation({
    summary: "Obtener perfil del usuario autenticado",
    description:
      "Devuelve la información de perfil del usuario logueado en la sesión activa.",
  })
  @ApiResponse({
    status: 200,
    description: "Perfil de usuario recuperado exitosamente",
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "No autenticado o token expirado",
  })
  async me(@CurrentUser() user: AuthenticatedUser) {
    const userProfile = await this.authService.getCurrentUser(user.id);
    return {
      success: true,
      data: userProfile,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("forgot-password")
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Solicitar restablecimiento de contraseña",
    description:
      "Genera un enlace de recuperación con token temporal (30 min) y lo envía al correo si existe. Respuesta neutra OWASP.",
  })
  @ApiResponse({
    status: 200,
    description: "Solicitud procesada con respuesta neutra de confirmación",
  })
  @ApiResponse({
    status: 429,
    description:
      "Demasiadas solicitudes. Límite de 5 peticiones cada 15 minutos superado.",
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.requestPasswordReset(dto.email);
    return {
      success: true,
      message: result.message,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get("verify-reset-token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Verificar validez del token de restablecimiento",
    description:
      "Valida que el token provisto no haya expirado (> 30 min) y no haya sido utilizado previamente.",
  })
  @ApiResponse({
    status: 200,
    description: "Token válido y vigente",
  })
  @ApiResponse({
    status: 401,
    description: "Token inválido, expirado o ya consumido",
  })
  async verifyResetToken(@Query("token") token: string) {
    const result = await this.authService.verifyResetToken(token);
    return {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("reset-password")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Restablecer contraseña de usuario",
    description:
      "Actualiza la contraseña cifrándola con Argon2id, invalida el token temporal y revoca sesiones previas.",
  })
  @ApiResponse({
    status: 200,
    description: "Contraseña actualizada exitosamente",
  })
  @ApiResponse({
    status: 400,
    description: "Contraseña débil o no cumple los criterios de registro",
  })
  @ApiResponse({
    status: 401,
    description: "No autenticado o token de reseteo inválido/expirado",
  })
  async resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResetPasswordDto,
  ) {
    const result = await this.authService.resetPassword(user.id, dto.password);
    return {
      success: true,
      message: result.message,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken?: string,
  ) {
    const isProd = process.env.NODE_ENV === "production";
    const sameSiteMode = isProd ? ("strict" as const) : ("lax" as const);

    // Access Token (15 minutos)
    response.cookie(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: sameSiteMode,
      maxAge: FIFTEEN_MINUTES_MS,
      path: "/",
    });
    response.cookie("auth_token", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: sameSiteMode,
      maxAge: FIFTEEN_MINUTES_MS,
      path: "/",
    });

    // Refresh Token (7 días, restringido a /api/auth)
    if (refreshToken) {
      response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: sameSiteMode,
        maxAge: SEVEN_DAYS_MS,
        path: "/api/auth",
      });
    }
  }

  private clearAuthCookies(response: Response) {
    const isProd = process.env.NODE_ENV === "production";
    const sameSiteMode = isProd ? ("strict" as const) : ("lax" as const);

    response.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: sameSiteMode,
      path: "/",
    });
    response.clearCookie("auth_token", {
      httpOnly: true,
      secure: isProd,
      sameSite: sameSiteMode,
      path: "/",
    });
    response.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: sameSiteMode,
      path: "/api/auth",
    });
  }
}
