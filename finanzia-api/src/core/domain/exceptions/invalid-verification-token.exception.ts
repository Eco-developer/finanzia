export class InvalidVerificationTokenException extends Error {
  constructor() {
    super("El token de verificación es inválido o ha expirado.");
    this.name = "InvalidVerificationTokenException";
  }
}
