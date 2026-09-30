import {
  Controller,
  Get,
  Post,
  Body,
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
import { ProfileService } from "../../core/application/profile/profile.service";
import { CompleteOnboardingDto } from "../dtos/profile/complete-onboarding.dto";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

@ApiTags("Onboarding")
@ApiBearerAuth()
@ApiCookieAuth("jwt_token")
@UseGuards(JwtAuthGuard)
@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly profileService: ProfileService) {}

  @Get("status")
  @ApiOperation({
    summary: "Consultar estado del onboarding del usuario autenticado",
    description:
      "Devuelve si el usuario ya completó el proceso inicial guiado (onboardingCompleted: true|false).",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Estado de onboarding obtenido con éxito",
  })
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getOnboardingStatus(user.id);
  }

  @Post("complete")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Completar el Wizard de Onboarding Inicial",
    description:
      "Registra objetivos de uso, perfil financiero opcional, aceptación del disclaimer y da de alta la primera cuenta manual en una única transacción atómica.",
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Onboarding completado exitosamente y primera cuenta creada",
  })
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.profileService.completeOnboarding(user.id, dto);
  }
}
