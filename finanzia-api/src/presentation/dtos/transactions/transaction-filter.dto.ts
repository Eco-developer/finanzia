import { ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class TransactionFilterDto {
  @ApiPropertyOptional({
    example: 1,
    description: "Número de página para paginación (inicia en 1)",
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "La página debe ser un número entero" })
  @Min(1, { message: "La página mínima es 1" })
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: "Límite de registros por página (máximo 100)",
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "El límite debe ser un número entero" })
  @Min(1, { message: "El límite mínimo por página es 1" })
  @Max(100, { message: "El límite máximo por página es 100" })
  limit?: number = 20;

  @ApiPropertyOptional({
    example: "acc-uuid-1",
    description: "Filtrar por identificador de cuenta financiera",
  })
  @IsOptional()
  @IsUUID("4", { message: "El accountId debe ser un UUID v4 válido" })
  accountId?: string;

  @ApiPropertyOptional({
    example: "cat-uuid-1",
    description: "Filtrar por identificador de categoría",
  })
  @IsOptional()
  @IsUUID("4", { message: "El categoryId debe ser un UUID v4 válido" })
  categoryId?: string;

  @ApiPropertyOptional({
    example: "2026-09-01T00:00:00.000Z",
    description: "Fecha inicial para filtrar transacciones (ISO 8601)",
  })
  @IsOptional()
  @IsISO8601({}, { message: "startDate debe tener un formato ISO 8601 válido" })
  startDate?: string;

  @ApiPropertyOptional({
    example: "2026-09-30T23:59:59.999Z",
    description: "Fecha final para filtrar transacciones (ISO 8601)",
  })
  @IsOptional()
  @IsISO8601({}, { message: "endDate debe tener un formato ISO 8601 válido" })
  endDate?: string;

  @ApiPropertyOptional({
    enum: TransactionType,
    example: TransactionType.EXPENSE,
    description: "Filtrar por tipo: INCOME, EXPENSE o TRANSFER",
  })
  @IsOptional()
  @IsEnum(TransactionType, {
    message: "El tipo debe ser INCOME, EXPENSE o TRANSFER",
  })
  type?: TransactionType;
}
