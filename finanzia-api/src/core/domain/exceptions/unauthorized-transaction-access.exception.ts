export class UnauthorizedTransactionAccessException extends Error {
  constructor(transactionId: string) {
    super(
      `No tienes permisos para modificar o acceder a la transacción con ID: ${transactionId}`,
    );
    this.name = "UnauthorizedTransactionAccessException";
  }
}
