import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Identificador único universal del usuario',
  })
  id: string;

  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Correo electrónico del usuario',
  })
  email: string;

  @ApiProperty({
    example: 'Miguel',
    description: 'Nombre de pila',
  })
  firstName: string;

  @ApiPropertyOptional({
    example: 'García',
    description: 'Apellidos (si existen)',
  })
  lastName: string | null;

  @ApiProperty({
    example: 'EUR',
    description: 'Divisa por defecto del usuario',
  })
  defaultCurrency: string;

  @ApiProperty({
    example: '2026-09-13T10:00:00.000Z',
    description: 'Fecha y hora de creación de la cuenta',
  })
  createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Datos del usuario autenticado',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiPropertyOptional({
    description: 'Token JWT de acceso (también enviado automáticamente en cookie HttpOnly)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token?: string;
}
