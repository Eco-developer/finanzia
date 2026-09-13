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
import { CategoriesService } from "../../core/application/categories/categories.service";
import { CreateCategoryDto } from "../dtos/categories/create-category.dto";
import { UpdateCategoryDto } from "../dtos/categories/update-category.dto";
import { CategoryResponseDto } from "../dtos/categories/category-response.dto";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

@ApiTags("Categories")
@ApiBearerAuth()
@ApiCookieAuth("jwt_token")
@UseGuards(JwtAuthGuard)
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Crear una categoría personalizada",
    description:
      "Crea una categoría de ingresos o gastos personalizada para el usuario autenticado. Admite asignación jerárquica a una categoría padre.",
  })
  @ApiResponse({
    status: 201,
    description: "Categoría creada exitosamente",
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Datos inválidos o referencia a categoría padre inválida",
  })
  @ApiResponse({
    status: 401,
    description: "No autorizado",
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ) {
    const category = await this.categoriesService.createCategory(user.id, dto);
    return {
      success: true,
      data: category,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get()
  @ApiOperation({
    summary: "Listar categorías disponibles para el usuario",
    description:
      "Devuelve las categorías globales del sistema más las categorías personalizadas pertenecientes exclusivamente al usuario autenticado.",
  })
  @ApiQuery({
    name: "includeArchived",
    required: false,
    type: Boolean,
    description: "Si es true, incluye categorías archivadas",
  })
  @ApiResponse({
    status: 200,
    description: "Listado de categorías obtenido exitosamente",
    type: [CategoryResponseDto],
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query("includeArchived") includeArchived?: string,
  ) {
    const isArchived = includeArchived === "true";
    const categories = await this.categoriesService.getUserCategories(
      user.id,
      isArchived,
    );
    return {
      success: true,
      data: categories,
      meta: {
        timestamp: new Date().toISOString(),
        total: categories.length,
      },
    };
  }

  @Get(":id")
  @ApiOperation({
    summary: "Obtener detalle de una categoría",
    description:
      "Obtiene una categoría por su ID, siempre que sea del sistema o pertenezca al usuario autenticado.",
  })
  @ApiParam({
    name: "id",
    description: "UUID de la categoría",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Detalle de la categoría",
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Categoría no encontrada",
  })
  @ApiResponse({
    status: 403,
    description: "Acceso no autorizado a la categoría solicitada",
  })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const category = await this.categoriesService.getCategoryById(user.id, id);
    return {
      success: true,
      data: category,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Actualizar una categoría personalizada",
    description:
      "Permite actualizar nombre, icono, color o categoría padre de una categoría creada por el usuario. Las categorías del sistema no pueden modificarse.",
  })
  @ApiParam({
    name: "id",
    description: "UUID de la categoría",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Categoría actualizada exitosamente",
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      "Prohibido: Intento de modificar categoría del sistema o de otro usuario",
  })
  @ApiResponse({
    status: 404,
    description: "Categoría no encontrada",
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.updateCategory(
      user.id,
      id,
      dto,
    );
    return {
      success: true,
      data: category,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Archivar una categoría personalizada",
    description:
      "Archiva una categoría propia del usuario para que no aparezca en nuevas selecciones, preservando integridad de transacciones pasadas.",
  })
  @ApiParam({
    name: "id",
    description: "UUID de la categoría a archivar",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Categoría archivada exitosamente",
    type: CategoryResponseDto,
  })
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const category = await this.categoriesService.archiveCategory(user.id, id);
    return {
      success: true,
      data: category,
      meta: {
        message: "Categoría archivada correctamente",
        timestamp: new Date().toISOString(),
      },
    };
  }
}
