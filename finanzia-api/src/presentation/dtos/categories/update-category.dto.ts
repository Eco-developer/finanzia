import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from "class-validator";

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: "Supermercado y Alimentación Familiar",
    description: "Nombre descriptivo de la categoría",
  })
  @IsOptional()
  @IsString({
    message: "El nombre de la categoría debe ser una cadena de texto",
  })
  @Length(2, 100, {
    message: "El nombre de la categoría debe tener entre 2 y 100 caracteres",
  })
  name?: string;

  @ApiPropertyOptional({
    example: "d9b2d63d-a233-4123-8478-4398e032904e",
    description: "Identificador UUID de la categoría padre",
  })
  @IsOptional()
  @IsUUID("4", { message: "El parentId debe ser un UUID v4 válido" })
  parentId?: string | null;

  @ApiPropertyOptional({
    example: "shopping-bag",
    description: "Clave del icono representativo",
  })
  @IsOptional()
  @IsString({ message: "El icono debe ser una cadena de texto" })
  icon?: string | null;

  @ApiPropertyOptional({
    example: "#3B82F6",
    description: "Código de color hexadecimal",
  })
  @IsOptional()
  @IsString({ message: "El color debe ser una cadena de texto" })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: "El color debe ser un código hexadecimal válido (ej. #3B82F6)",
  })
  colorHex?: string | null;

  @ApiPropertyOptional({
    example: false,
    description: "Indica si la categoría se encuentra archivada",
  })
  @IsOptional()
  @IsBoolean({ message: "isArchived debe ser un valor booleano" })
  isArchived?: boolean;
}
