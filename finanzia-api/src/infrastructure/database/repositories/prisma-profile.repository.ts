import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  IProfileRepository,
  SaveUserProfileData,
  SaveFinancialProfileData,
  SaveDisclaimerLogData,
  CompleteOnboardingData,
  FullUserProfileAggregate,
} from "../../../core/domain/repositories/profile.repository.interface";
import { UserProfileEntity } from "../../../core/domain/entities/user-profile.entity";
import { UserFinancialProfileEntity } from "../../../core/domain/entities/user-financial-profile.entity";
import { UserDisclaimerLogEntity } from "../../../core/domain/entities/user-disclaimer-log.entity";
import { AccountEntity } from "../../../core/domain/entities/account.entity";

@Injectable()
export class PrismaProfileRepository implements IProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getFullProfile(userId: string): Promise<FullUserProfileAggregate> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        financialProfile: true,
        disclaimerLog: true,
      },
    });

    if (!user) {
      return {
        profile: null,
        financialProfile: null,
        disclaimerLog: null,
        onboardingCompleted: false,
      };
    }

    return {
      profile: user.profile ? this.toProfileDomain(user.profile) : null,
      financialProfile: user.financialProfile
        ? this.toFinancialProfileDomain(user.financialProfile)
        : null,
      disclaimerLog: user.disclaimerLog
        ? this.toDisclaimerLogDomain(user.disclaimerLog)
        : null,
      onboardingCompleted: user.onboardingCompleted,
    };
  }

  async upsertUserProfile(
    userId: string,
    data: SaveUserProfileData,
  ): Promise<UserProfileEntity> {
    const record = await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        usageGoals: data.usageGoals,
        customGoal: data.customGoal ?? null,
        preferredCurrency: data.preferredCurrency || "EUR",
      },
      update: {
        usageGoals: data.usageGoals,
        customGoal: data.customGoal !== undefined ? data.customGoal : undefined,
        preferredCurrency: data.preferredCurrency,
      },
    });
    return this.toProfileDomain(record);
  }

  async upsertFinancialProfile(
    userId: string,
    data: SaveFinancialProfileData,
  ): Promise<UserFinancialProfileEntity> {
    const record = await this.prisma.userFinancialProfile.upsert({
      where: { userId },
      create: {
        userId,
        profession: data.profession ?? null,
        annualGrossIncome: data.annualGrossIncome ?? null,
        hasRealEstateIncome: data.hasRealEstateIncome ?? null,
        hasStockInvestments: data.hasStockInvestments ?? null,
        hasCryptoInvestments: data.hasCryptoInvestments ?? null,
        emergencyFundRange: data.emergencyFundRange ?? null,
        experienceLevel: data.experienceLevel ?? "INTERMEDIATE",
      },
      update: {
        profession: data.profession,
        annualGrossIncome: data.annualGrossIncome,
        hasRealEstateIncome: data.hasRealEstateIncome,
        hasStockInvestments: data.hasStockInvestments,
        hasCryptoInvestments: data.hasCryptoInvestments,
        emergencyFundRange: data.emergencyFundRange,
        experienceLevel: data.experienceLevel,
      },
    });
    return this.toFinancialProfileDomain(record);
  }

  async recordDisclaimerAcceptance(
    userId: string,
    data: SaveDisclaimerLogData,
  ): Promise<UserDisclaimerLogEntity> {
    const record = await this.prisma.userDisclaimerLog.upsert({
      where: { userId },
      create: {
        userId,
        termsAccepted: data.termsAccepted,
        appVersion: data.appVersion || "1.0.0",
      },
      update: {
        termsAccepted: data.termsAccepted,
        acceptedAt: new Date(),
        appVersion: data.appVersion || "1.0.0",
      },
    });
    return this.toDisclaimerLogDomain(record);
  }

  async completeOnboarding(
    userId: string,
    data: CompleteOnboardingData,
  ): Promise<{
    profile: UserProfileEntity;
    financialProfile: UserFinancialProfileEntity | null;
    disclaimerLog: UserDisclaimerLogEntity;
    account: AccountEntity;
  }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Guardar o actualizar perfil general
      const profileRecord = await tx.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          usageGoals: data.profile.usageGoals,
          customGoal: data.profile.customGoal ?? null,
          preferredCurrency: data.profile.preferredCurrency || "EUR",
        },
        update: {
          usageGoals: data.profile.usageGoals,
          customGoal: data.profile.customGoal ?? null,
          preferredCurrency: data.profile.preferredCurrency || "EUR",
        },
      });

      // 2. Guardar perfil financiero opcional
      let financialRecord = null;
      if (data.financialProfile) {
        financialRecord = await tx.userFinancialProfile.upsert({
          where: { userId },
          create: {
            userId,
            profession: data.financialProfile.profession ?? null,
            annualGrossIncome: data.financialProfile.annualGrossIncome ?? null,
            hasRealEstateIncome:
              data.financialProfile.hasRealEstateIncome ?? null,
            hasStockInvestments:
              data.financialProfile.hasStockInvestments ?? null,
            hasCryptoInvestments:
              data.financialProfile.hasCryptoInvestments ?? null,
            emergencyFundRange:
              data.financialProfile.emergencyFundRange ?? null,
            experienceLevel:
              data.financialProfile.experienceLevel ?? "INTERMEDIATE",
          },
          update: {
            profession: data.financialProfile.profession,
            annualGrossIncome: data.financialProfile.annualGrossIncome,
            hasRealEstateIncome: data.financialProfile.hasRealEstateIncome,
            hasStockInvestments: data.financialProfile.hasStockInvestments,
            hasCryptoInvestments: data.financialProfile.hasCryptoInvestments,
            emergencyFundRange: data.financialProfile.emergencyFundRange,
            experienceLevel: data.financialProfile.experienceLevel,
          },
        });
      }

      // 3. Registrar disclaimer legal
      const disclaimerRecord = await tx.userDisclaimerLog.upsert({
        where: { userId },
        create: {
          userId,
          termsAccepted: data.disclaimer.termsAccepted,
          appVersion: data.disclaimer.appVersion || "1.0.0",
        },
        update: {
          termsAccepted: data.disclaimer.termsAccepted,
          acceptedAt: new Date(),
          appVersion: data.disclaimer.appVersion || "1.0.0",
        },
      });

      // 4. Crear primera cuenta manual (solo si el usuario no tiene ninguna previa)
      let accountRecord = await tx.account.findFirst({
        where: { userId },
      });

      if (!accountRecord) {
        accountRecord = await tx.account.create({
          data: {
            userId,
            name: data.initialAccount.name,
            type: data.initialAccount.type,
            initialBalanceCents: data.initialAccount.initialBalanceCents,
            currentBalanceCents: data.initialAccount.initialBalanceCents,
            currency: data.initialAccount.currency || "EUR",
          },
        });
      }

      // 5. Marcar onboarding como completado en el usuario
      await tx.user.update({
        where: { id: userId },
        data: {
          onboardingCompleted: true,
          defaultCurrency: data.profile.preferredCurrency || "EUR",
        },
      });

      return {
        profile: this.toProfileDomain(profileRecord),
        financialProfile: financialRecord
          ? this.toFinancialProfileDomain(financialRecord)
          : null,
        disclaimerLog: this.toDisclaimerLogDomain(disclaimerRecord),
        account: new AccountEntity(
          accountRecord.id,
          accountRecord.userId,
          accountRecord.name,
          accountRecord.type,
          accountRecord.initialBalanceCents,
          accountRecord.currentBalanceCents,
          accountRecord.currency,
          accountRecord.isArchived,
          accountRecord.createdAt,
          accountRecord.updatedAt,
        ),
      };
    });
  }

  private toProfileDomain(record: any): UserProfileEntity {
    return new UserProfileEntity(
      record.id,
      record.userId,
      record.usageGoals,
      record.customGoal,
      record.preferredCurrency,
      record.createdAt,
      record.updatedAt,
    );
  }

  private toFinancialProfileDomain(record: any): UserFinancialProfileEntity {
    return new UserFinancialProfileEntity(
      record.id,
      record.userId,
      record.profession,
      record.annualGrossIncome,
      record.hasRealEstateIncome,
      record.hasStockInvestments,
      record.hasCryptoInvestments,
      record.emergencyFundRange,
      record.experienceLevel,
      record.createdAt,
      record.updatedAt,
    );
  }

  private toDisclaimerLogDomain(record: any): UserDisclaimerLogEntity {
    return new UserDisclaimerLogEntity(
      record.id,
      record.userId,
      record.termsAccepted,
      record.acceptedAt,
      record.appVersion,
    );
  }
}
