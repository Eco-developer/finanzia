import { ApiProperty } from "@nestjs/swagger";
import { IsArray, ArrayNotEmpty, IsUUID } from "class-validator";

export class BatchDeleteTransactionsDto {
  @ApiProperty({
    description: "Array de UUIDs de las transacciones a eliminar",
    example: [
      "a8e10d8a-8671-46bb-9bd9-3c721c56ef9a",
      "b2c3d4e5-1234-5678-9abc-def012345678",
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: "Debe proporcionar al menos un ID de transacción" })
  @IsUUID("4", { each: true, message: "Cada ID debe ser un UUID v4 válido" })
  ids: string[];
}
