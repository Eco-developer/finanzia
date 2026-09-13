import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CategoryType } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({
    example: "Supermercado y Alimentación",
    description: "Nombre descriptivo de la categoría",
  })
  @IsString({
    message: "El nombre de la categoría debe ser una cadena de texto",
  })
  @IsNotEmpty({ message: "El nombre de la categoría es obligatorio" })
  @Length(2, 100, {
    message: "El nombre de la categoría debe tener entre 2 y 100 caracteres",
  })
  name: string;

  @ApiProperty({
    enum: CategoryType,
    example: CategoryType.EXPENSE,
    description: "Tipo de categoría: INCOME o EXPENSE",
  })
  @IsEnum(CategoryType, {
    message: "El tipo de categoría debe ser INCOME o EXPENSE",
  })
  type: CategoryType;

  @ApiPropertyOptional({
    example: "d9b2d63d-a233-4123-8478-4398e032904e",
    description:
      "Identificador UUID de la categoría padre (para subcategorías)",
  })
  @IsOptional()
  @IsUUID("4", { message: "El parentId debe ser un UUID v4 válido" })
  parentId?: string;

  @ApiPropertyOptional({
    example: "shopping-cart",
    description: "Nombre o clave del icono representativo",
  })
  @IsOptional()
  @IsString({ message: "El icono debe ser una cadena de texto" })
  icon?: string;

  @ApiPropertyOptional({
    example: "#10B981",
    description: "Código de color hexadecimal para gráficos e interfaz",
  })
  @IsOptional()
  @IsString({ message: "El color debe ser una cadena de texto" })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: "El color debe ser un código hexadecimal válido (ej. #10B981)",
  })
  colorHex?: string;
}
