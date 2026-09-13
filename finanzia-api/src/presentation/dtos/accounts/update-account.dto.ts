import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateAccountDto {
  @ApiPropertyOptional({
    example: 'Cuenta Ahorro Personal',
    description: 'Nuevo nombre para la cuenta',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  name?: string;

  @ApiPropertyOptional({
    enum: AccountType,
    example: AccountType.SAVINGS,
    description: 'Nuevo tipo de cuenta financiera',
  })
  @IsOptional()
  @IsEnum(AccountType, {
    message: 'El tipo de cuenta debe ser CHECKING, SAVINGS, CREDIT_CARD, CASH o INVESTMENT',
  })
  type?: AccountType;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si la cuenta está archivada/oculta',
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo isArchived debe ser un valor booleano' })
  isArchived?: boolean;
}
