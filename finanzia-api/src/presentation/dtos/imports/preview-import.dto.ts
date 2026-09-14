import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsUUID,
  IsArray,
  ValidateNested,
  IsInt,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

export class ImportRowDto {
  @ApiProperty({
    description: "Identificador temporal de la fila generado en el cliente",
    example: "row-1",
  })
  @IsString()
  @IsNotEmpty()
  rowId: string;

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

  @ApiProperty({
    description:
      "Hash SHA-256 generado para deduplicación: sha256(fecha + importe + concepto)",
    example: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  })
  @IsString()
  @IsNotEmpty()
  hash: string;
}

export class PreviewImportDto {
  @ApiProperty({
    description: "ID de la cuenta financiera receptora de la importación",
    example: "a8e10d8a-8671-46bb-9bd9-3c721c56ef9a",
  })
  @IsUUID("4")
  accountId: string;

  @ApiProperty({
    description: "Listado de filas extraídas del archivo CSV",
    type: [ImportRowDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  rows: ImportRowDto[];
}
