import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AccountType, FinancialExperienceLevel } from "@prisma/client";
import {
  IsArray,
  ArrayNotEmpty,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  Equals,
} from "class-validator";

export class CompleteOnboardingDto {
  // -------------------------------------------------------------
  // PASO 1: Objetivos de uso y preferencias de IA
  // -------------------------------------------------------------
  @ApiProperty({
    example: ["track_expenses", "ai_budget_optimization"],
    description: "Lista de metas u objetivos de uso seleccionados",
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
    example: "Organizar mi dinero para independizarme",
    description: "Motivo detallado cuando se marca la opción Otros",
    maxLength: 250,
  })
  @IsOptional()
  @IsString({ message: "El motivo personalizado debe ser un texto" })
  @MaxLength(250, {
    message: "El motivo personalizado no puede superar los 250 caracteres",
  })
  customGoal?: string;

  // -------------------------------------------------------------
  // PASO 2: Perfil Económico y Activos (Opcional)
  // -------------------------------------------------------------
  @ApiPropertyOptional({
    example: "Ingeniero de Software",
    description: "Profesión u ocupación",
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
  @IsString({ message: "El rango salarial debe ser una cadena de texto" })
  annualGrossIncome?: string;

  @ApiPropertyOptional({
    example: false,
    description: "¿Posee inmuebles o propiedades que generen ingresos?",
  })
  @IsOptional()
  @IsBoolean({ message: "hasRealEstateIncome debe ser booleano" })
  hasRealEstateIncome?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: "¿Posee inversiones en bolsa o fondos?",
  })
  @IsOptional()
  @IsBoolean({ message: "hasStockInvestments debe ser booleano" })
  hasStockInvestments?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: "¿Posee inversiones en criptomonedas o activos digitales?",
  })
  @IsOptional()
  @IsBoolean({ message: "hasCryptoInvestments debe ser booleano" })
  hasCryptoInvestments?: boolean;

  @ApiPropertyOptional({
    example: "3-6m",
    description: "Fondo de emergencia estimado",
  })
  @IsOptional()
  @IsString({ message: "El fondo de emergencia debe ser una cadena de texto" })
  emergencyFundRange?: string;

  @ApiPropertyOptional({
    enum: FinancialExperienceLevel,
    example: FinancialExperienceLevel.INTERMEDIATE,
    description: "Nivel autopercibido de experiencia financiera",
  })
  @IsOptional()
  @IsEnum(FinancialExperienceLevel, {
    message:
      "El nivel de experiencia debe ser BEGINNER, INTERMEDIATE o ADVANCED",
  })
  experienceLevel?: FinancialExperienceLevel;

  // -------------------------------------------------------------
  // PASO 3: Disclaimer Legal y Compromiso de Privacidad
  // -------------------------------------------------------------
  @ApiProperty({
    example: true,
    description:
      "Aceptación explícita de los términos de privacidad y límites legales",
  })
  @IsBoolean({ message: "termsAccepted debe ser un valor booleano" })
  @Equals(true, {
    message: "Debes aceptar los términos y disclaimers para continuar",
  })
  termsAccepted: boolean;

  // -------------------------------------------------------------
  // PASO 4: Creación de la primera cuenta manual
  // -------------------------------------------------------------
  @ApiProperty({
    example: "Cuenta Nómina",
    description: "Nombre descriptivo de la cuenta de apertura",
  })
  @IsString({ message: "El nombre de la cuenta debe ser una cadena de texto" })
  @IsNotEmpty({ message: "El nombre de la cuenta es obligatorio" })
  @Length(2, 100, {
    message: "El nombre de la cuenta debe tener entre 2 y 100 caracteres",
  })
  accountName: string;

  @ApiProperty({
    enum: AccountType,
    example: AccountType.CHECKING,
    description: "Tipo de cuenta financiera",
  })
  @IsEnum(AccountType, {
    message:
      "El tipo de cuenta debe ser CHECKING, SAVINGS, CREDIT_CARD, CASH o INVESTMENT",
  })
  accountType: AccountType;

  @ApiProperty({
    example: 100000,
    description:
      "Saldo inicial en céntimos enteros (cero float). Ej. 1.000,00 € = 100000",
    default: 0,
  })
  @IsInt({
    message:
      "El saldo inicial debe ser un número entero en céntimos (cero float)",
  })
  @Min(0, { message: "El saldo inicial en céntimos no puede ser negativo" })
  initialBalanceCents: number;

  @ApiPropertyOptional({
    example: "EUR",
    description:
      "Divisa de la cuenta y preferencia del usuario (ISO 4217, 3 caracteres)",
    default: "EUR",
  })
  @IsOptional()
  @IsString({ message: "La divisa debe ser una cadena de texto" })
  @Length(3, 3, {
    message:
      "El código de divisa debe constar exactamente de 3 caracteres (ej. EUR, USD)",
  })
  currency?: string;

  @ApiPropertyOptional({
    example: "EUR",
    description: "Divisa preferida del perfil (ISO 4217, 3 caracteres)",
    default: "EUR",
  })
  @IsOptional()
  @IsString({ message: "La divisa preferida debe ser una cadena de texto" })
  @Length(3, 3, {
    message:
      "El código de divisa debe constar exactamente de 3 caracteres (ej. EUR, USD)",
  })
  preferredCurrency?: string;
}
