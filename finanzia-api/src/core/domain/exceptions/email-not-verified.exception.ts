export class EmailNotVerifiedException extends Error {
  constructor(public readonly email: string) {
    super(
      `El correo electrónico ${email} no ha sido verificado. Por favor revisa tu bandeja de entrada.`,
    );
    this.name = "EmailNotVerifiedException";
  }
}
