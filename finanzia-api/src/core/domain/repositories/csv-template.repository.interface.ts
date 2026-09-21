import {
  CsvTemplateEntity,
  CsvColumnMapping,
} from "../entities/csv-template.entity";

export interface ICsvTemplateRepository {
  findAllByUserId(userId: string): Promise<CsvTemplateEntity[]>;
  findByUserIdAndBank(
    userId: string,
    bankName: string,
  ): Promise<CsvTemplateEntity | null>;
  upsertTemplate(
    userId: string,
    bankName: string,
    columnMapping: CsvColumnMapping,
  ): Promise<CsvTemplateEntity>;
  deleteById(userId: string, id: string): Promise<boolean>;
}

export const CSV_TEMPLATE_REPOSITORY = Symbol("ICsvTemplateRepository");
