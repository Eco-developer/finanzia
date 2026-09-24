export class ImmutableDebtException extends Error {
  constructor(debtId: string) {
    super(
      `[FinanZIA Domain Error] La deuda con ID '${debtId}' ha sido amortizada al 100% y forma parte del historial inmutable. No puede ser modificada ni eliminada.`,
    );
    this.name = "ImmutableDebtException";
    Object.setPrototypeOf(this, ImmutableDebtException.prototype);
  }
}
