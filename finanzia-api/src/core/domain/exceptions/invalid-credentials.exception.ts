export class InvalidCredentialsException extends Error {
  constructor() {
    super("Las credenciales de acceso son inválidas o incorrectas");
    this.name = "InvalidCredentialsException";
  }
}
