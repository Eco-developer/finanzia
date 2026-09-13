export class UnauthorizedAccountAccessException extends Error {
  constructor(accountId: string) {
    super(`Acceso no autorizado a la cuenta con identificador: ${accountId}`);
    this.name = "UnauthorizedAccountAccessException";
  }
}
