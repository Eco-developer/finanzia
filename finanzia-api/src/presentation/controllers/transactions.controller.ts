import {
  Controller,
  Post,
  Get,
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
  ApiParam,
} from "@nestjs/swagger";
import { TransactionsService } from "../../core/application/transactions/transactions.service";
import { CreateTransactionDto } from "../dtos/transactions/create-transaction.dto";
import { CreateTransferDto } from "../dtos/transactions/create-transfer.dto";
import { TransactionFilterDto } from "../dtos/transactions/transaction-filter.dto";
import { TransactionResponseDto } from "../dtos/transactions/transaction-response.dto";
import { TransferResponseDto } from "../dtos/transactions/transfer-response.dto";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

@ApiTags("Transactions")
@ApiBearerAuth()
@ApiCookieAuth("jwt_token")
@UseGuards(JwtAuthGuard)
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Registrar una nueva transacción monetaria",
    description:
      "Registra un ingreso o gasto manual y actualiza de forma atómica en una sola transacción SQL el saldo de la cuenta asociada. El importe se maneja estrictamente en céntimos enteros (cero float).",
  })
  @ApiResponse({
    status: 201,
    description: "Transacción creada exitosamente",
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Datos inválidos o importe igual a cero",
  })
  @ApiResponse({
    status: 403,
    description: "Intento de asociar transacción a cuenta o categoría ajena",
  })
  @ApiResponse({
    status: 404,
    description: "Cuenta o categoría no encontrada",
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ) {
    const result = await this.transactionsService.createTransaction(
      user.id,
      dto,
    );
    return {
      success: true,
      data: result.transaction,
      meta: {
        newAccountBalanceCents: result.newAccountBalanceCents,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post("transfer")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Registrar un traspaso/transferencia entre dos cuentas propias",
    description:
      "Genera atómicamente dos transacciones vinculadas (salida en cuenta origen y entrada en cuenta destino) y actualiza los saldos consolidados de ambas cuentas dentro de una única transacción SQL.",
  })
  @ApiResponse({
    status: 201,
    description: "Transferencia completada exitosamente",
    type: TransferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Cuentas idénticas o importe no positivo",
  })
  @ApiResponse({
    status: 403,
    description: "Una o ambas cuentas no pertenecen al usuario autenticado",
  })
  async createTransfer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransferDto,
  ) {
    const result = await this.transactionsService.createTransfer(user.id, dto);
    return {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get()
  @ApiOperation({
    summary: "Listar transacciones paginadas con filtros",
    description:
      "Devuelve el histórico de transacciones del usuario autenticado, con soporte para filtrado por cuenta, categoría, rango de fechas y tipo.",
  })
  @ApiResponse({
    status: 200,
    description: "Listado paginado de transacciones",
    type: [TransactionResponseDto],
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: TransactionFilterDto,
  ) {
    const result = await this.transactionsService.getTransactions(
      user.id,
      filter,
    );
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        totalRecords: result.totalRecords,
        totalPages: result.totalPages,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(":id")
  @ApiOperation({
    summary: "Obtener detalle de una transacción",
    description:
      "Obtiene una transacción por su ID, validando que pertenezca al usuario autenticado.",
  })
  @ApiParam({
    name: "id",
    description: "UUID de la transacción",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Detalle de la transacción",
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Transacción no encontrada",
  })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const transaction = await this.transactionsService.getTransactionById(
      user.id,
      id,
    );
    return {
      success: true,
      data: transaction,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Eliminar transacción y revertir saldo atómicamente",
    description:
      "Elimina el registro de la transacción y revierte algebraicamente el saldo de la cuenta. Si es una transferencia, elimina la contrapartida y revierte también su respectivo saldo.",
  })
  @ApiParam({
    name: "id",
    description: "UUID de la transacción a eliminar",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Transacción eliminada y saldo revertido exitosamente",
  })
  @ApiResponse({
    status: 403,
    description: "No autorizado a eliminar esta transacción",
  })
  @ApiResponse({
    status: 404,
    description: "Transacción no encontrada",
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const result = await this.transactionsService.deleteTransaction(
      user.id,
      id,
    );
    return {
      success: true,
      data: result,
      meta: {
        message: "Transacción eliminada y saldos revertidos con éxito",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
