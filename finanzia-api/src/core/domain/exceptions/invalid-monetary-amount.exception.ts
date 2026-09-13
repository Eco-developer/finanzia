export class InvalidMonetaryAmountException extends Error {
  constructor(message: string) {
    super(`[FinanZIA Domain Error] Error Monetario: ${message}`);
    this.name = 'InvalidMonetaryAmountException';
    Object.setPrototypeOf(this, InvalidMonetaryAmountException.prototype);
  }
}
