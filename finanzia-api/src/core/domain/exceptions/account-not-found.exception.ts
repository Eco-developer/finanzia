export class AccountNotFoundException extends Error {
  constructor(accountId: string) {
    super(`No se encontró la cuenta con identificador: ${accountId}`);
    this.name = "AccountNotFoundException";
  }
}
