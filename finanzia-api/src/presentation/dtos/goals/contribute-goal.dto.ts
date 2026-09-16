import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class ContributeGoalDto {
  @ApiProperty({
    example: 10000,
    description: "Importe a ingresar en la meta en céntimos enteros (ej. 10000 = 100,00 €)",
  })
  @Type(() => Number)
  @IsInt({ message: "El importe debe ser un entero en céntimos" })
  @Min(1, { message: "El importe a aportar debe ser mayor que cero" })
  amountCents: number;
}
