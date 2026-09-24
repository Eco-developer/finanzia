export class DebtNotFoundException extends Error {
  constructor(debtId: string) {
    super(`[FinanZIA Domain Error] La deuda con ID '${debtId}' no existe.`);
    this.name = "DebtNotFoundException";
    Object.setPrototypeOf(this, DebtNotFoundException.prototype);
  }
}
