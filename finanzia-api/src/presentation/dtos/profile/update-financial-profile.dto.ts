import { ApiPropertyOptional } from "@nestjs/swagger";
import { FinancialExperienceLevel } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateFinancialProfileDto {
  @ApiPropertyOptional({
    example: "Ingeniero de Software",
    description: "Profesión u ocupación del usuario",
  })
  @IsOptional()
  @IsString({ message: "La profesión debe ser una cadena de texto" })
  @MaxLength(100, {
    message: "La profesión no puede superar los 100 caracteres",
  })
  profession?: string;

  @ApiPropertyOptional({
    example: "30000-50000",
    description: "Rango de ingresos brutos anuales",
  })
  @IsOptional()
  @IsString({ message: "El rango de ingresos debe ser una cadena de texto" })
  annualGrossIncome?: string;

  @ApiPropertyOptional({
    example: false,
    description: "Indica si posee activos inmobiliarios que generen rentas",
  })
  @IsOptional()
  @IsBoolean({ message: "hasRealEstateIncome debe ser un valor booleano" })
  hasRealEstateIncome?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      "Indica si posee inversiones en bolsa, acciones, ETFs o fondos",
  })
  @IsOptional()
  @IsBoolean({ message: "hasStockInvestments debe ser un valor booleano" })
  hasStockInvestments?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      "Indica si posee inversiones en criptomonedas o activos digitales",
  })
  @IsOptional()
  @IsBoolean({ message: "hasCryptoInvestments debe ser un valor booleano" })
  hasCryptoInvestments?: boolean;

  @ApiPropertyOptional({
    example: "3-6m",
    description: "Rango de cobertura de su fondo de emergencia",
  })
  @IsOptional()
  @IsString({ message: "El fondo de emergencia debe ser una cadena de texto" })
  emergencyFundRange?: string;

  @ApiPropertyOptional({
    enum: FinancialExperienceLevel,
    example: FinancialExperienceLevel.INTERMEDIATE,
    description:
      "Nivel autopercibido de conocimiento y familiaridad financiera",
  })
  @IsOptional()
  @IsEnum(FinancialExperienceLevel, {
    message:
      "El nivel de experiencia debe ser BEGINNER, INTERMEDIATE o ADVANCED",
  })
  experienceLevel?: FinancialExperienceLevel;
}
