import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsObject, IsOptional } from "class-validator";

export class CsvColumnMappingDto {
  @ApiProperty({
    description: "Nombre de la columna de fecha en el CSV",
    example: "Fecha",
  })
  @IsString()
  @IsNotEmpty()
  dateCol: string;

  @ApiProperty({
    description: "Nombre de la columna de concepto o descripción en el CSV",
    example: "Concepto",
  })
  @IsString()
  @IsNotEmpty()
  descCol: string;

  @ApiProperty({
    description: "Nombre de la columna de importe en el CSV",
    example: "Importe",
  })
  @IsString()
  @IsNotEmpty()
  amountCol: string;

  @ApiPropertyOptional({
    description: "Nombre de columna opcional de ingresos (si vienen separados)",
    example: "Ingreso",
  })
  @IsOptional()
  @IsString()
  incomeCol?: string;

  @ApiPropertyOptional({
    description: "Nombre de columna opcional de gastos (si vienen separados)",
    example: "Gasto",
  })
  @IsOptional()
  @IsString()
  expenseCol?: string;

  @ApiPropertyOptional({
    description: "Delimitador del archivo (ej. ';' o ',')",
    example: ";",
  })
  @IsOptional()
  @IsString()
  delimiter?: string;

  @ApiPropertyOptional({
    description:
      "Formato de fecha de las filas (ej. 'DD/MM/YYYY', 'YYYY-MM-DD')",
    example: "DD/MM/YYYY",
  })
  @IsOptional()
  @IsString()
  dateFormat?: string;
}

export class SaveCsvTemplateDto {
  @ApiProperty({
    description: "Nombre de la entidad bancaria asociada a la plantilla",
    example: "BBVA",
  })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({
    description: "Mapeo de nombres de columnas y opciones de parseo",
    type: CsvColumnMappingDto,
  })
  @IsObject()
  columnMapping: CsvColumnMappingDto;
}
