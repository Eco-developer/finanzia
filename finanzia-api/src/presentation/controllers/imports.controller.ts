import {
  Controller,
  Post,
  Get,
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
import { ImportsService } from "../../core/application/imports/imports.service";
import { PreviewImportDto } from "../dtos/imports/preview-import.dto";
import { CommitImportDto } from "../dtos/imports/commit-import.dto";
import {
  PreviewImportResponseDto,
  CommitImportResponseDto,
} from "../dtos/imports/import-response.dto";
import { SaveCsvTemplateDto } from "../dtos/imports/save-csv-template.dto";
import { CsvTemplateResponseDto } from "../dtos/imports/csv-template-response.dto";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

@ApiTags("Imports")
@ApiBearerAuth()
@ApiCookieAuth("jwt_token")
@UseGuards(JwtAuthGuard)
@Controller("imports")
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post("preview")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Previsualizar importación CSV y detectar duplicados",
    description:
      "Recibe las filas parseadas en el cliente con sus hashes para detectar transacciones que ya existen en la base de datos y sugerir categorización automática por palabras clave.",
  })
  @ApiResponse({
    status: 200,
    description: "Previsualización calculada exitosamente",
    type: PreviewImportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Datos de entrada inválidos",
  })
  @ApiResponse({
    status: 403,
    description: "Intento de importar en cuenta de otro usuario",
  })
  @ApiResponse({
    status: 404,
    description: "Cuenta no encontrada",
  })
  async preview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PreviewImportDto,
  ) {
    const data = await this.importsService.previewImport(user.id, dto);
    return {
      success: true,
      data,
    };
  }

  @Post("commit")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Confirmar e insertar transacciones importadas en bloque",
    description:
      "Inserta atómicamente en una única transacción SQL todas las transacciones aprobadas, omitiendo duplicados y recalculando el saldo neto de la cuenta asociada.",
  })
  @ApiResponse({
    status: 201,
    description: "Transacciones importadas y saldo consolidado exitosamente",
    type: CommitImportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Datos de entrada inválidos",
  })
  @ApiResponse({
    status: 403,
    description: "Intento de importar en cuenta ajena",
  })
  @ApiResponse({
    status: 404,
    description: "Cuenta no encontrada",
  })
  async commit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CommitImportDto,
  ) {
    const data = await this.importsService.commitImport(user.id, dto);
    return {
      success: true,
      data,
    };
  }

  @Get("templates")
  @ApiOperation({
    summary: "Listar plantillas de mapeo bancario guardadas",
    description:
      "Obtiene las plantillas de mapeo de columnas CSV guardadas por el usuario (ej. BBVA, Santander, Revolut).",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de plantillas del usuario",
    type: [CsvTemplateResponseDto],
  })
  async getTemplates(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.importsService.getTemplates(user.id);
    return {
      success: true,
      data,
    };
  }

  @Post("templates")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Guardar o actualizar una plantilla de mapeo bancario",
    description:
      "Guarda la asociación de nombres de columnas y delimitadores para una entidad bancaria específica.",
  })
  @ApiResponse({
    status: 201,
    description: "Plantilla guardada exitosamente",
    type: CsvTemplateResponseDto,
  })
  async saveTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveCsvTemplateDto,
  ) {
    const data = await this.importsService.saveTemplate(user.id, dto);
    return {
      success: true,
      data,
    };
  }

  @Delete("templates/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Eliminar una plantilla de mapeo bancario",
    description: "Elimina una plantilla guardada por su identificador UUID.",
  })
  @ApiParam({
    name: "id",
    description: "UUID de la plantilla a eliminar",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Plantilla eliminada o no encontrada",
  })
  async deleteTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    const success = await this.importsService.deleteTemplate(user.id, id);
    return { success };
  }
}
