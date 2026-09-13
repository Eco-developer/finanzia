export class InvalidTransferException extends Error {
  constructor(reason: string) {
    super(`No se puede realizar la transferencia: ${reason}`);
    this.name = "InvalidTransferException";
  }
}
