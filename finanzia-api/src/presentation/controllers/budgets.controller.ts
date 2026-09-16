import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { BudgetsService } from "../../core/application/budgets/budgets.service";
import { CreateBudgetDto } from "../dtos/budgets/create-budget.dto";
import { UpdateBudgetDto } from "../dtos/budgets/update-budget.dto";
import { BudgetPacingResponseDto } from "../dtos/budgets/budget-pacing-response.dto";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

@ApiTags("Budgets")
@ApiBearerAuth()
@ApiCookieAuth("jwt_token")
@UseGuards(JwtAuthGuard)
@Controller("budgets")
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Crear o actualizar presupuesto mensual por categoría",
    description:
      "Asigna un límite de gasto en céntimos para una categoría específica en un periodo mes/año.",
  })
  @ApiResponse({ status: 201, description: "Presupuesto guardado exitosamente" })
  @ApiResponse({ status: 400, description: "Datos del presupuesto inválidos" })
  @ApiResponse({ status: 404, description: "Categoría no encontrada" })
  async createBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBudgetDto,
  ) {
    const budget = await this.budgetsService.createOrUpdateBudget(user.id, dto);
    return {
      success: true,
      data: budget,
    };
  }

  @Get()
  @ApiOperation({
    summary: "Listar presupuestos del usuario",
    description: "Devuelve los presupuestos configurados opcionalmente filtrados por mes y año.",
  })
  @ApiQuery({ name: "month", required: false, type: Number, description: "Mes (1-12)" })
  @ApiQuery({ name: "year", required: false, type: Number, description: "Año (ej. 2026)" })
  async getBudgets(
    @CurrentUser() user: AuthenticatedUser,
    @Query("month") month?: string,
    @Query("year") year?: string,
  ) {
    const m = month ? parseInt(month, 10) : undefined;
    const y = year ? parseInt(year, 10) : undefined;
    const budgets = await this.budgetsService.getBudgets(user.id, m, y);
    return {
      success: true,
      data: budgets,
    };
  }

  @Get("pacing")
  @ApiOperation({
    summary: "Consultar ritmo de ejecución presupuestaria en tiempo real",
    description:
      "Calcula el consumo actual de cada categoría contra su límite mensual para el periodo especificado.",
  })
  @ApiQuery({ name: "month", required: true, type: Number, example: 9 })
  @ApiQuery({ name: "year", required: true, type: Number, example: 2026 })
  @ApiResponse({
    status: 200,
    description: "Cálculo de ritmo devuelto exitosamente",
    type: BudgetPacingResponseDto,
  })
  async getBudgetPacing(
    @CurrentUser() user: AuthenticatedUser,
    @Query("month") month: string,
    @Query("year") year: string,
  ): Promise<BudgetPacingResponseDto> {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    return await this.budgetsService.getBudgetPacing(user.id, m, y);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Modificar límite o alerta de un presupuesto",
  })
  @ApiParam({ name: "id", description: "UUID del presupuesto" })
  async updateBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    const updated = await this.budgetsService.updateBudget(user.id, id, dto);
    return {
      success: true,
      data: updated,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Eliminar un presupuesto",
  })
  @ApiParam({ name: "id", description: "UUID del presupuesto" })
  async deleteBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.budgetsService.deleteBudget(user.id, id);
  }
}
