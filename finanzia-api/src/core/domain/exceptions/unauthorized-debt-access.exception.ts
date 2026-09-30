export class UnauthorizedDebtAccessException extends Error {
  constructor(debtId: string, userId: string) {
    super(
      `[FinanZIA Domain Error] Acceso no autorizado: el usuario '${userId}' no es titular de la deuda '${debtId}'.`,
    );
    this.name = "UnauthorizedDebtAccessException";
    Object.setPrototypeOf(this, UnauthorizedDebtAccessException.prototype);
  }
}
