import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateGoalDto {
  @ApiPropertyOptional({
    example: "Fondo de Emergencia Actualizado",
    description: "Nuevo nombre para la meta de ahorro",
  })
  @IsOptional()
  @IsString({ message: "El nombre debe ser una cadena de texto" })
  @Length(2, 100, { message: "El nombre debe tener entre 2 y 100 caracteres" })
  name?: string;

  @ApiPropertyOptional({
    example: 400000,
    description: "Nuevo monto objetivo en céntimos enteros",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "El objetivo debe ser un entero en céntimos" })
  @Min(1, { message: "El objetivo debe ser mayor que cero" })
  targetAmountCents?: number;

  @ApiPropertyOptional({
    example: "2027-06-30T23:59:59.000Z",
    description: "Nueva fecha objetivo (ISO 8601)",
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: "La fecha objetivo debe ser una fecha ISO válida" },
  )
  targetDate?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Estado de cumplimiento de la meta",
  })
  @IsOptional()
  @IsBoolean({ message: "isCompleted debe ser un valor booleano" })
  isCompleted?: boolean;
}
