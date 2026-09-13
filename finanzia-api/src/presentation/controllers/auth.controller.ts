import {
  Controller,
  Post,
  Get,
  Body,
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
import { Response } from "express";
import { AuthService } from "../../core/application/auth/auth.service";
import { RegisterDto } from "../dtos/auth/register.dto";
import { LoginDto } from "../dtos/auth/login.dto";
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
      "Crea un nuevo usuario en la plataforma, cifra la contraseña con Argon2id y emite un token JWT en una cookie HttpOnly segura.",
  })
  @ApiResponse({
    status: 201,
    description: "Usuario registrado exitosamente",
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
    this.setAuthCookie(response, result.token!);

    return {
      success: true,
      data: result.user,
      token: result.token,
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
      "Verifica las credenciales del usuario con Argon2id y establece la cookie de sesión HttpOnly.",
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
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setAuthCookie(response, result.token!);

    return {
      success: true,
      data: result.user,
      token: result.token,
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
      "Invalida la sesión eliminando las cookies seguras de autenticación.",
  })
  @ApiResponse({
    status: 200,
    description: "Sesión finalizada correctamente",
  })
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    response.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return {
      success: true,
      message: "Sesión finalizada correctamente",
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

  private setAuthCookie(response: Response, token: string) {
    const isProd = process.env.NODE_ENV === "production";
    response.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: SEVEN_DAYS_MS,
      path: "/",
    });
    // Compatibilidad adicional
    response.cookie("auth_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: SEVEN_DAYS_MS,
      path: "/",
    });
  }
}
