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
import { AccountsService } from "../../core/application/accounts/accounts.service";
import { CreateAccountDto } from "../dtos/accounts/create-account.dto";
import { UpdateAccountDto } from "../dtos/accounts/update-account.dto";
import { AccountResponseDto } from "../dtos/accounts/account-response.dto";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

@ApiTags("Accounts")
@ApiBearerAuth()
@ApiCookieAuth("jwt_token")
@UseGuards(JwtAuthGuard)
@Controller("accounts")
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Crear una nueva cuenta financiera",
    description:
      "Crea una cuenta bancaria, de ahorro, tarjeta o efectivo asociada al usuario autenticado. El saldo inicial debe enviarse estrictamente en céntimos enteros (cero float).",
  })
  @ApiResponse({
    status: 201,
    description: "Cuenta creada exitosamente",
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      "Datos de entrada inválidos o tipos numéricos flotantes en saldo",
  })
  @ApiResponse({
    status: 401,
    description: "No autorizado",
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAccountDto,
  ) {
    const account = await this.accountsService.createAccount(user.id, dto);
    return {
      success: true,
      data: account,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get()
  @ApiOperation({
    summary: "Listar cuentas del usuario",
    description:
      "Devuelve el listado completo de cuentas financieras pertenecientes exclusivamente al usuario autenticado (aislamiento multi-tenant estricto).",
  })
  @ApiQuery({
    name: "includeArchived",
    required: false,
    type: Boolean,
    description: "Si es true, incluye las cuentas archivadas en el resultado",
  })
  @ApiResponse({
    status: 200,
    description: "Listado de cuentas obtenido exitosamente",
    type: [AccountResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: "No autorizado",
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query("includeArchived") includeArchived?: string,
  ) {
    const shouldIncludeArchived = includeArchived === "true";
    const accounts = await this.accountsService.getUserAccounts(
      user.id,
      shouldIncludeArchived,
    );
    return {
      success: true,
      data: accounts,
      meta: {
        totalRecords: accounts.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(":id")
  @ApiOperation({
    summary: "Obtener detalle de una cuenta por ID",
    description:
      "Recupera los datos de una cuenta específica siempre que pertenezca al usuario autenticado.",
  })
  @ApiParam({
    name: "id",
    type: String,
    description: "UUID de la cuenta financiera",
  })
  @ApiResponse({
    status: 200,
    description: "Detalle de la cuenta recuperado exitosamente",
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Acceso denegado a cuentas de otros usuarios",
  })
  @ApiResponse({
    status: 404,
    description: "Cuenta no encontrada",
  })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const account = await this.accountsService.getAccountById(user.id, id);
    return {
      success: true,
      data: account,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Actualizar datos de una cuenta",
    description:
      "Modifica el nombre, tipo o estado de archivado de una cuenta perteneciente al usuario autenticado.",
  })
  @ApiParam({
    name: "id",
    type: String,
    description: "UUID de la cuenta financiera a actualizar",
  })
  @ApiResponse({
    status: 200,
    description: "Cuenta actualizada exitosamente",
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Acceso denegado a cuentas de otros usuarios",
  })
  @ApiResponse({
    status: 404,
    description: "Cuenta no encontrada",
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    const account = await this.accountsService.updateAccount(user.id, id, dto);
    return {
      success: true,
      data: account,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Archivar una cuenta (Soft Delete)",
    description:
      "Marca la cuenta como archivada para preservarla en el historial de transacciones sin eliminar datos contables.",
  })
  @ApiParam({
    name: "id",
    type: String,
    description: "UUID de la cuenta financiera a archivar",
  })
  @ApiResponse({
    status: 200,
    description: "Cuenta archivada exitosamente",
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Acceso denegado a cuentas de otros usuarios",
  })
  @ApiResponse({
    status: 404,
    description: "Cuenta no encontrada",
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const account = await this.accountsService.archiveAccount(user.id, id);
    return {
      success: true,
      message: "Cuenta archivada correctamente",
      data: account,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
