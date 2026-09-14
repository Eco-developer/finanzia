export interface CsvColumnMapping {
  dateCol: string;
  descCol: string;
  amountCol: string;
  incomeCol?: string;
  expenseCol?: string;
  delimiter?: string;
  dateFormat?: string;
}

export class CsvTemplateEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly bankName: string,
    public readonly columnMapping: CsvColumnMapping,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
