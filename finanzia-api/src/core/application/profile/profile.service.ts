import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import {
  IProfileRepository,
  PROFILE_REPOSITORY,
} from "../../domain/repositories/profile.repository.interface";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../domain/repositories/user.repository.interface";
import { UserNotFoundException } from "../../domain/exceptions/user-not-found.exception";
import { UpdateProfileDto } from "../../../presentation/dtos/profile/update-profile.dto";
import { UpdateFinancialProfileDto } from "../../../presentation/dtos/profile/update-financial-profile.dto";
import { CompleteOnboardingDto } from "../../../presentation/dtos/profile/complete-onboarding.dto";
import { FullProfileResponseDto } from "../../../presentation/dtos/profile/profile-response.dto";

@Injectable()
export class ProfileService {
  constructor(
    @Inject(PROFILE_REPOSITORY)
    private readonly profileRepository: IProfileRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async getFullProfile(userId: string): Promise<FullProfileResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }

    const aggregate = await this.profileRepository.getFullProfile(userId);

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      onboardingCompleted: user.onboardingCompleted,
      defaultCurrency: user.defaultCurrency,
      profile: aggregate.profile
        ? {
            usageGoals: aggregate.profile.usageGoals,
            customGoal: aggregate.profile.customGoal,
            preferredCurrency: aggregate.profile.preferredCurrency,
            updatedAt: aggregate.profile.updatedAt,
          }
        : null,
      financialProfile: aggregate.financialProfile
        ? {
            profession: aggregate.financialProfile.profession,
            annualGrossIncome: aggregate.financialProfile.annualGrossIncome,
            hasRealEstateIncome: aggregate.financialProfile.hasRealEstateIncome,
            hasStockInvestments: aggregate.financialProfile.hasStockInvestments,
            hasCryptoInvestments:
              aggregate.financialProfile.hasCryptoInvestments,
            emergencyFundRange: aggregate.financialProfile.emergencyFundRange,
            experienceLevel: aggregate.financialProfile.experienceLevel,
            updatedAt: aggregate.financialProfile.updatedAt,
          }
        : null,
      disclaimerLog: aggregate.disclaimerLog
        ? {
            termsAccepted: aggregate.disclaimerLog.termsAccepted,
            acceptedAt: aggregate.disclaimerLog.acceptedAt,
            appVersion: aggregate.disclaimerLog.appVersion,
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }

    const updated = await this.profileRepository.upsertUserProfile(userId, {
      usageGoals: dto.usageGoals,
      customGoal: dto.customGoal,
      preferredCurrency: dto.preferredCurrency,
    });

    return {
      usageGoals: updated.usageGoals,
      customGoal: updated.customGoal,
      preferredCurrency: updated.preferredCurrency,
      updatedAt: updated.updatedAt,
    };
  }

  async updateFinancialProfile(userId: string, dto: UpdateFinancialProfileDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }

    const updated = await this.profileRepository.upsertFinancialProfile(
      userId,
      dto,
    );

    return {
      profession: updated.profession,
      annualGrossIncome: updated.annualGrossIncome,
      hasRealEstateIncome: updated.hasRealEstateIncome,
      hasStockInvestments: updated.hasStockInvestments,
      hasCryptoInvestments: updated.hasCryptoInvestments,
      emergencyFundRange: updated.emergencyFundRange,
      experienceLevel: updated.experienceLevel,
      updatedAt: updated.updatedAt,
    };
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }

    if (user.onboardingCompleted) {
      throw new BadRequestException(
        "El proceso de configuración inicial (onboarding) ya ha sido completado previamente.",
      );
    }

    if (!dto.termsAccepted) {
      throw new BadRequestException(
        "Debes aceptar los términos y disclaimers para continuar",
      );
    }

    const currency =
      dto.currency || dto.preferredCurrency || user.defaultCurrency || "EUR";

    const result = await this.profileRepository.completeOnboarding(userId, {
      profile: {
        usageGoals: dto.usageGoals,
        customGoal: dto.customGoal,
        preferredCurrency: currency,
      },
      financialProfile: {
        profession: dto.profession,
        annualGrossIncome: dto.annualGrossIncome,
        hasRealEstateIncome: dto.hasRealEstateIncome,
        hasStockInvestments: dto.hasStockInvestments,
        hasCryptoInvestments: dto.hasCryptoInvestments,
        emergencyFundRange: dto.emergencyFundRange,
        experienceLevel: dto.experienceLevel,
      },
      disclaimer: {
        termsAccepted: dto.termsAccepted,
        appVersion: "1.0.0",
      },
      initialAccount: {
        name: dto.accountName,
        type: dto.accountType,
        initialBalanceCents: BigInt(dto.initialBalanceCents),
        currency,
      },
    });

    return {
      success: true,
      message: "Onboarding completado con éxito",
      onboardingCompleted: true,
      account: {
        id: result.account.id,
        name: result.account.name,
        type: result.account.type,
        currency: result.account.currency,
        initialBalanceCents: Number(result.account.initialBalanceCents),
        currentBalanceCents: Number(result.account.currentBalanceCents),
      },
    };
  }

  async getOnboardingStatus(
    userId: string,
  ): Promise<{ onboardingCompleted: boolean }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }
    return {
      onboardingCompleted: user.onboardingCompleted,
    };
  }
}
