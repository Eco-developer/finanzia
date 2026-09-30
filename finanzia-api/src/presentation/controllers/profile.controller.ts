import {
  Controller,
  Get,
  Put,
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
import { UpdateProfileDto } from "../dtos/profile/update-profile.dto";
import { UpdateFinancialProfileDto } from "../dtos/profile/update-financial-profile.dto";
import { FullProfileResponseDto } from "../dtos/profile/profile-response.dto";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

@ApiTags("Profile")
@ApiBearerAuth()
@ApiCookieAuth("jwt_token")
@UseGuards(JwtAuthGuard)
@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({
    summary: "Obtener perfil unificado del usuario",
    description:
      "Devuelve datos personales, objetivos de uso, perfil financiero y estado de disclaimers.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Perfil unificado obtenido con éxito",
    type: FullProfileResponseDto,
  })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FullProfileResponseDto> {
    return this.profileService.getFullProfile(user.id);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Actualizar objetivos de uso y preferencias generales",
    description:
      "Permite actualizar la lista de metas, el motivo personalizado y la divisa preferida.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Objetivos de perfil actualizados con éxito",
  })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Put("financial")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Actualizar perfil económico y activos patrimoniales",
    description:
      "Actualiza profesión, salario anual, inversiones y nivel financiero sin pedir datos adicionales.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Perfil económico actualizado con éxito",
  })
  async updateFinancialProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFinancialProfileDto,
  ) {
    return this.profileService.updateFinancialProfile(user.id, dto);
  }
}
