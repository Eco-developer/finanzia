export class UserNotFoundException extends Error {
  constructor(identifier: string) {
    super(`No se encontró ningún usuario con el identificador: ${identifier}`);
    this.name = "UserNotFoundException";
  }
}
