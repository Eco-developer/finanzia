import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
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
  ApiParam,
} from "@nestjs/swagger";
import { DebtsService } from "../../core/application/debts/debts.service";
import { CreateDebtDto } from "../dtos/debts/create-debt.dto";
import { UpdateDebtDto } from "../dtos/debts/update-debt.dto";
import { AmortizeDebtDto } from "../dtos/debts/amortize-debt.dto";
import { SimulatePayoffDto } from "../dtos/debts/simulate-payoff.dto";
import {
  ActiveDebtsResponseDto,
  DebtResponseDto,
} from "../dtos/debts/debt-response.dto";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

@ApiTags("Debts")
@ApiBearerAuth()
@ApiCookieAuth("jwt_token")
@UseGuards(JwtAuthGuard)
@Controller("debts")
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Dar de alta una nueva deuda o pasivo financiero",
  })
  @ApiResponse({
    status: 201,
    description: "Deuda creada exitosamente",
    type: DebtResponseDto,
  })
  async createDebt(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDebtDto,
  ) {
    const debt = await this.debtsService.createDebt(user.id, dto);
    return {
      success: true,
      data: debt,
    };
  }

  @Get()
  @ApiOperation({
    summary: "Listar todas las deudas activas con métricas consolidadas",
  })
  @ApiResponse({
    status: 200,
    description: "Listado de deudas activas y resumen de métricas",
    type: ActiveDebtsResponseDto,
  })
  async getActiveDebts(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.debtsService.getActiveDebts(user.id);
    return {
      success: true,
      data: result.debts,
      summary: result.summary,
    };
  }

  @Get("history")
  @ApiOperation({
    summary: "Consultar historial inmutable de deudas liquidadas al 100%",
  })
  @ApiResponse({
    status: 200,
    description: "Listado inmutable de pasivos totalmente pagados",
    type: [DebtResponseDto],
  })
  async getDebtHistory(@CurrentUser() user: AuthenticatedUser) {
    const debts = await this.debtsService.getDebtHistory(user.id);
    return {
      success: true,
      data: debts,
    };
  }

  @Post("simulate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Simular plan de amortización acelerada (Avalancha vs Bola de Nieve)",
  })
  @ApiResponse({
    status: 200,
    description: "Proyección comparativa con ahorro de tiempo e intereses",
  })
  async simulatePayoff(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SimulatePayoffDto,
  ) {
    const simulation = await this.debtsService.simulatePayoff(user.id, dto);
    return {
      success: true,
      data: simulation,
    };
  }

  @Get(":id")
  @ApiOperation({
    summary: "Consultar detalle de una deuda y su cronograma de amortizaciones",
  })
  @ApiParam({ name: "id", description: "UUID de la deuda" })
  @ApiResponse({
    status: 200,
    description: "Detalle de la deuda",
    type: DebtResponseDto,
  })
  async getDebtById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const debt = await this.debtsService.getDebtById(user.id, id);
    return {
      success: true,
      data: debt,
    };
  }

  @Patch(":id")
  @ApiOperation({
    summary:
      "Actualizar datos de una deuda activa (Bloqueado si está al 100% pagada)",
  })
  @ApiParam({ name: "id", description: "UUID de la deuda" })
  @ApiResponse({
    status: 200,
    description: "Deuda actualizada",
    type: DebtResponseDto,
  })
  async updateDebt(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateDebtDto,
  ) {
    const debt = await this.debtsService.updateDebt(user.id, id, dto);
    return {
      success: true,
      data: debt,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Eliminar una deuda activa (Bloqueado si forma parte del historial inmutable)",
  })
  @ApiParam({ name: "id", description: "UUID de la deuda" })
  async deleteDebt(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.debtsService.deleteDebt(user.id, id);
  }

  @Post(":id/amortize")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Registrar amortización de capital e intereses (Sella al 100% de forma inmutable si llega a cero)",
  })
  @ApiParam({ name: "id", description: "UUID de la deuda" })
  @ApiResponse({
    status: 200,
    description: "Amortización aplicada con desglose de capital e intereses",
  })
  async amortizeDebt(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AmortizeDebtDto,
  ) {
    const result = await this.debtsService.amortizeDebt(user.id, id, dto);
    return {
      success: true,
      data: result,
      message: result.isFullyPaid
        ? "¡Enhorabuena! Has amortizado la totalidad de la deuda. Ha quedado sellada en el historial inmutable."
        : "Amortización registrada correctamente.",
    };
  }
}
