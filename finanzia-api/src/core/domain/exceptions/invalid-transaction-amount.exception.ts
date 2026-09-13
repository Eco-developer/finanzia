export class InvalidTransactionAmountException extends Error {
  constructor(reason: string) {
    super(`El importe de la transacción es inválido: ${reason}`);
    this.name = "InvalidTransactionAmountException";
  }
}
