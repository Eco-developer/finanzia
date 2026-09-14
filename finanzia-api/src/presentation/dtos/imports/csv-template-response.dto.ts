import { ApiProperty } from "@nestjs/swagger";
import { CsvColumnMappingDto } from "./save-csv-template.dto";

export class CsvTemplateResponseDto {
  @ApiProperty({
    description: "ID único de la plantilla",
    example: "c4b8b2e1-4321-4fba-8123-9876543210ab",
  })
  id: string;

  @ApiProperty({
    description: "Nombre de la entidad bancaria",
    example: "BBVA",
  })
  bankName: string;

  @ApiProperty({
    description: "Configuración de mapeo de columnas",
    type: CsvColumnMappingDto,
  })
  columnMapping: CsvColumnMappingDto;

  @ApiProperty({
    description: "Fecha de creación",
  })
  createdAt: Date;

  @ApiProperty({
    description: "Fecha de última actualización",
  })
  updatedAt: Date;
}
