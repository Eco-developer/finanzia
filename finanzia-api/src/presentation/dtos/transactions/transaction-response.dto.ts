import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType } from "@prisma/client";

export class TransactionResponseDto {
  @ApiProperty({
    example: "tx-uuid-1",
    description: "Identificador único UUID de la transacción",
  })
  id: string;

  @ApiProperty({
    example: "user-uuid-1",
    description: "UUID del usuario propietario",
  })
  userId: string;

  @ApiProperty({
    example: "acc-uuid-1",
    description: "UUID de la cuenta financiera asociada",
  })
  accountId: string;

  @ApiPropertyOptional({
    example: "cat-uuid-1",
    description: "UUID de la categoría asignada",
    nullable: true,
  })
  categoryId: string | null;

  @ApiProperty({
    example: -4590,
    description:
      "Importe en céntimos enteros (negativo para gasto, positivo para ingreso)",
  })
  amountCents: number;

  @ApiProperty({
    enum: TransactionType,
    example: TransactionType.EXPENSE,
    description: "Tipo de operación: INCOME, EXPENSE o TRANSFER",
  })
  type: TransactionType;

  @ApiProperty({
    example: "2026-09-13T12:00:00.000Z",
    description: "Fecha en que se produjo la operación",
  })
  transactionDate: Date;

  @ApiProperty({
    example: "Compra en Mercadona",
    description: "Descripción o concepto del movimiento",
  })
  description: string;

  @ApiPropertyOptional({
    example: "Artículos de limpieza y comida",
    description: "Notas adicionales",
    nullable: true,
  })
  notes: string | null;

  @ApiProperty({
    example: false,
    description:
      "Indica si la transacción está pendiente de confirmación bancaria",
  })
  isPending: boolean;

  @ApiPropertyOptional({
    example: "tx-uuid-counterpart",
    description:
      "Identificador de la transacción contrapartida en transferencias",
    nullable: true,
  })
  transferCounterpartId: string | null;

  @ApiPropertyOptional({
    example: "sha256-hash-value",
    description: "Hash SHA-256 para desduplicación de extractos bancarios CSV",
    nullable: true,
  })
  deduplicationHash: string | null;

  @ApiProperty({
    example: "2026-09-13T12:00:00.000Z",
    description: "Fecha de creación del registro",
  })
  createdAt: Date;

  @ApiProperty({
    example: "2026-09-13T12:00:00.000Z",
    description: "Fecha de última actualización",
  })
  updatedAt: Date;
}
