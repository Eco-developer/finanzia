import { ApiProperty } from "@nestjs/swagger";
import { TransactionResponseDto } from "./transaction-response.dto";

export class TransferResponseDto {
  @ApiProperty({
    description: "Transacción de débito/salida en la cuenta de origen",
    type: TransactionResponseDto,
  })
  fromTransaction: TransactionResponseDto;

  @ApiProperty({
    description: "Transacción de crédito/entrada en la cuenta de destino",
    type: TransactionResponseDto,
  })
  toTransaction: TransactionResponseDto;

  @ApiProperty({
    example: 185000,
    description: "Nuevo saldo consolidado de la cuenta de origen en céntimos",
  })
  newFromBalanceCents: number;

  @ApiProperty({
    example: 215000,
    description: "Nuevo saldo consolidado de la cuenta de destino en céntimos",
  })
  newToBalanceCents: number;
}
