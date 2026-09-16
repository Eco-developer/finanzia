import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateGoalDto {
  @ApiProperty({
    example: "Fondo de Emergencia",
    description: "Nombre de la meta de ahorro",
  })
  @IsString({ message: "El nombre de la meta debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El nombre de la meta es obligatorio" })
  @Length(2, 100, {
    message: "El nombre de la meta debe tener entre 2 y 100 caracteres",
  })
  name: string;

  @ApiProperty({
    example: 300000,
    description: "Monto objetivo en céntimos enteros (ej. 300000 = 3.000,00 €)",
  })
  @Type(() => Number)
  @IsInt({ message: "El objetivo debe ser un entero en céntimos" })
  @Min(1, { message: "El objetivo debe ser mayor que cero" })
  targetAmountCents: number;

  @ApiPropertyOptional({
    example: 50000,
    description: "Monto inicial acumulado en céntimos (default 0)",
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "El monto actual debe ser un entero en céntimos" })
  @Min(0, { message: "El monto actual no puede ser negativo" })
  currentAmountCents?: number;

  @ApiPropertyOptional({
    example: "2026-12-31T23:59:59.000Z",
    description: "Fecha estimada para alcanzar el objetivo (ISO 8601)",
  })
  @IsOptional()
  @IsDateString({}, { message: "La fecha objetivo debe ser una fecha ISO válida" })
  targetDate?: string;
}
