import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  ArrayNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  Length,
} from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({
    example: ["control_expenses", "ai_budget_optimization"],
    description:
      "Lista de identificadores de metas u objetivos de uso seleccionados",
    type: [String],
  })
  @IsArray({ message: "Los objetivos de uso deben ser una lista" })
  @ArrayNotEmpty({ message: "Debes seleccionar al menos un objetivo de uso" })
  @IsString({
    each: true,
    message: "Cada objetivo debe ser una cadena de texto",
  })
  usageGoals: string[];

  @ApiPropertyOptional({
    example: "Aprender a invertir en renta fija paso a paso",
    description:
      "Texto libre especificado cuando se selecciona la opción Otros",
    maxLength: 250,
  })
  @IsOptional()
  @IsString({ message: "El motivo personalizado debe ser un texto" })
  @MaxLength(250, {
    message: "El motivo personalizado no puede exceder los 250 caracteres",
  })
  customGoal?: string;

  @ApiPropertyOptional({
    example: "EUR",
    description: "Divisa base preferida (ISO 4217, 3 caracteres)",
    default: "EUR",
  })
  @IsOptional()
  @IsString({ message: "La divisa debe ser una cadena de texto" })
  @Length(3, 3, {
    message:
      "El código de divisa debe constar exactamente de 3 caracteres (ej. EUR, USD)",
  })
  preferredCurrency?: string;
}
