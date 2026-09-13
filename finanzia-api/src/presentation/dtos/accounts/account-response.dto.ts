import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';

export class AccountResponseDto {
  @ApiProperty({
    example: 'acc-uuid-1',
    description: 'Identificador único universal de la cuenta',
  })
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Identificador del usuario propietario',
  })
  userId: string;

  @ApiProperty({
    example: 'Cuenta Principal BBVA',
    description: 'Nombre de la cuenta',
  })
  name: string;

  @ApiProperty({
    enum: AccountType,
    example: AccountType.CHECKING,
    description: 'Tipo de cuenta',
  })
  type: AccountType;

  @ApiProperty({
    example: 100000,
    description: 'Saldo inicial de apertura en céntimos enteros (cero float)',
  })
  initialBalanceCents: number;

  @ApiProperty({
    example: 245050,
    description: 'Saldo actual consolidado en céntimos enteros (ej. 2.450,50 € = 245050)',
  })
  currentBalanceCents: number;

  @ApiProperty({
    example: 'EUR',
    description: 'Divisa ISO de la cuenta',
  })
  currency: string;

  @ApiProperty({
    example: false,
    description: 'Indica si la cuenta ha sido archivada',
  })
  isArchived: boolean;

  @ApiProperty({
    example: '2026-09-13T10:00:00.000Z',
    description: 'Fecha de creación de la cuenta',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-09-13T10:00:00.000Z',
    description: 'Fecha de última actualización',
  })
  updatedAt: Date;
}
