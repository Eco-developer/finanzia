import { ApiProperty } from "@nestjs/swagger";

export class RowPreviewDto {
  @ApiProperty({
    description: "Identificador temporal de la fila",
    example: "row-1",
  })
  rowId: string;

  @ApiProperty({
    description: "Indica si la transacción ya existe en la base de datos",
    example: false,
  })
  isDuplicate: boolean;

  @ApiProperty({
    description: "ID de categoría sugerida por coincidencia de palabras clave",
    example: "b1f3c7e4-9876-4abc-9999-1234567890ab",
    nullable: true,
  })
  suggestedCategoryId: string | null;

  @ApiProperty({
    description: "Nombre de la categoría sugerida",
    example: "Restaurantes",
    nullable: true,
  })
  suggestedCategoryName: string | null;
}

export class PreviewImportResponseDto {
  @ApiProperty({
    description: "Total de filas analizadas",
    example: 10,
  })
  totalRows: number;

  @ApiProperty({
    description: "Total de filas nuevas listas para importar",
    example: 8,
  })
  newCount: number;

  @ApiProperty({
    description: "Total de transacciones duplicadas detectadas",
    example: 2,
  })
  duplicateCount: number;

  @ApiProperty({
    description:
      "Previsualización detallada por fila con estado y categorización",
    type: [RowPreviewDto],
  })
  preview: RowPreviewDto[];
}

export class CommitImportResponseDto {
  @ApiProperty({
    description: "Número de transacciones importadas e insertadas con éxito",
    example: 8,
  })
  importedCount: number;

  @ApiProperty({
    description: "Número de filas descartadas o duplicadas omitidas",
    example: 2,
  })
  skippedCount: number;

  @ApiProperty({
    description: "Total de filas procesadas",
    example: 10,
  })
  totalProcessed: number;

  @ApiProperty({
    description: "Nuevo saldo consolidado de la cuenta en céntimos enteros",
    example: 154200,
  })
  newAccountBalanceCents: number;
}
