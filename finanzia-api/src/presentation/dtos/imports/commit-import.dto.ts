import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsUUID,
  IsArray,
  ValidateNested,
  IsInt,
  IsNotEmpty,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

export class CommitRowDto {
  @ApiProperty({
    description:
      "Fecha de la transacción bancaria (formato ISO 8601 o YYYY-MM-DD)",
    example: "2026-09-10T00:00:00.000Z",
  })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: "Concepto, beneficiario o descripción de la transacción",
    example: "RESTAURANTE EL BODEGON",
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description:
      "Importe en céntimos enteros (cero float). Negativo para gastos, positivo para ingresos.",
    example: -3250,
  })
  @IsInt()
  amountCents: number;

  @ApiPropertyOptional({
    description: "ID opcional de categoría asignada a la transacción",
    example: "b1f3c7e4-9876-4abc-9999-1234567890ab",
  })
  @IsOptional()
  @IsUUID("4")
  categoryId?: string;

  @ApiPropertyOptional({
    description: "Hash SHA-256 para prevenir inserciones duplicadas",
    example: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  })
  @IsOptional()
  @IsString()
  deduplicationHash?: string;
}

export class CommitImportDto {
  @ApiProperty({
    description: "ID de la cuenta financiera receptora de la importación",
    example: "a8e10d8a-8671-46bb-9bd9-3c721c56ef9a",
  })
  @IsUUID("4")
  accountId: string;

  @ApiProperty({
    description: "Listado de filas aprobadas por el usuario para inserción",
    type: [CommitRowDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitRowDto)
  rows: CommitRowDto[];
}
