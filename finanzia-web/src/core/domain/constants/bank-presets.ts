export interface BankPreset {
  id: string;
  name: string;
  color: string;
  delimiter: string;
  dateColNames: string[];
  descColNames: string[];
  amountColNames: string[];
  incomeColNames?: string[];
  expenseColNames?: string[];
  dateFormat?: string;
}

export const BANK_PRESETS: BankPreset[] = [
  {
    id: "bbva",
    name: "BBVA",
    color: "#004481",
    delimiter: ";",
    dateColNames: ["Fecha", "FECHA", "F. Operación", "Fecha valor"],
    descColNames: ["Concepto", "CONCEPTO", "Descripción", "Movimiento"],
    amountColNames: ["Importe", "IMPORTE", "Importe EUR"],
    dateFormat: "DD/MM/YYYY",
  },
  {
    id: "santander",
    name: "Banco Santander",
    color: "#EC0000",
    delimiter: ";",
    dateColNames: ["FECHA OPERACIÓN", "Fecha operación", "Fecha", "FECHA"],
    descColNames: ["CONCEPTO", "Concepto", "DESCRIPCIÓN"],
    amountColNames: ["IMPORTE EUR", "Importe", "IMPORTE"],
    dateFormat: "DD/MM/YYYY",
  },
  {
    id: "caixabank",
    name: "CaixaBank",
    color: "#007EA7",
    delimiter: ";",
    dateColNames: ["Fecha", "FECHA", "Fecha operación"],
    descColNames: ["Descripción", "DESCRIPCIÓN", "Concepto"],
    amountColNames: ["Importe", "IMPORTE", "Importe en EUR"],
    dateFormat: "DD/MM/YYYY",
  },
  {
    id: "revolut",
    name: "Revolut",
    color: "#19B5FE",
    delimiter: ",",
    dateColNames: ["Started Date", "Completed Date", "Fecha"],
    descColNames: ["Description", "Descripción", "Concepto"],
    amountColNames: ["Amount", "Importe", "Monto"],
    dateFormat: "YYYY-MM-DD",
  },
  {
    id: "openbank",
    name: "Openbank",
    color: "#D82036",
    delimiter: ";",
    dateColNames: ["Fecha de Operación", "Fecha operacion", "Fecha"],
    descColNames: ["Concepto", "Detalle"],
    amountColNames: ["Importe", "Importe EUR"],
    dateFormat: "DD/MM/YYYY",
  },
  {
    id: "n26",
    name: "N26",
    color: "#36A18B",
    delimiter: ",",
    dateColNames: ["Date", "Fecha"],
    descColNames: ["Payee", "Payment reference", "Concepto"],
    amountColNames: ["Amount (EUR)", "Amount", "Importe"],
    dateFormat: "YYYY-MM-DD",
  },
];
