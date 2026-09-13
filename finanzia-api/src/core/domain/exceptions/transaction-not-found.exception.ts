export class TransactionNotFoundException extends Error {
  constructor(transactionId: string) {
    super(`No se encontró la transacción con identificador: ${transactionId}`);
    this.name = "TransactionNotFoundException";
  }
}
