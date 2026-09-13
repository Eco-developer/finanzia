export class UserAlreadyExistsException extends Error {
  constructor(email: string) {
    super(`El correo electrónico '${email}' ya se encuentra registrado`);
    this.name = "UserAlreadyExistsException";
  }
}
