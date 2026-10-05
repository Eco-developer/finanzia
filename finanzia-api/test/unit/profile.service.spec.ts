import { Test, TestingModule } from "@nestjs/testing";
import { ProfileService } from "../../src/core/application/profile/profile.service";
import {
  IProfileRepository,
  PROFILE_REPOSITORY,
} from "../../src/core/domain/repositories/profile.repository.interface";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../src/core/domain/repositories/user.repository.interface";
import { UserNotFoundException } from "../../src/core/domain/exceptions/user-not-found.exception";
import { BadRequestException } from "@nestjs/common";
import { UserEntity } from "../../src/core/domain/entities/user.entity";
import { UserProfileEntity } from "../../src/core/domain/entities/user-profile.entity";
import { UserFinancialProfileEntity } from "../../src/core/domain/entities/user-financial-profile.entity";
import { UserDisclaimerLogEntity } from "../../src/core/domain/entities/user-disclaimer-log.entity";
import { AccountEntity } from "../../src/core/domain/entities/account.entity";
import { AccountType, FinancialExperienceLevel } from "@prisma/client";

describe("ProfileService", () => {
  let service: ProfileService;
  let mockProfileRepo: jest.Mocked<IProfileRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;

  const mockUser = new UserEntity(
    "usr-1",
    "test@finanzia.com",
    "hashed_password",
    "Miguel",
    "García",
    "EUR",
    new Date(),
    new Date(),
    true,
    false,
  );

  const mockUserProfile = new UserProfileEntity(
    "prof-1",
    "usr-1",
    ["control_expenses", "ai_budget_optimization"],
    "Mi motivo",
    "EUR",
    new Date(),
    new Date(),
  );

  const mockFinancialProfile = new UserFinancialProfileEntity(
    "fin-1",
    "usr-1",
    "Ingeniero de Software",
    "30000-50000",
    false,
    true,
    true,
    "3-6m",
    FinancialExperienceLevel.INTERMEDIATE,
    new Date(),
    new Date(),
  );

  const mockDisclaimerLog = new UserDisclaimerLogEntity(
    "disc-1",
    "usr-1",
    true,
    new Date(),
    "1.0.0",
  );

  const mockAccount = new AccountEntity(
    "acc-1",
    "usr-1",
    "Cuenta Nómina BBVA",
    AccountType.CHECKING,
    150000n,
    150000n,
    "EUR",
    false,
    new Date(),
    new Date(),
  );

  beforeEach(async () => {
    mockProfileRepo = {
      getFullProfile: jest.fn(),
      upsertUserProfile: jest.fn(),
      upsertFinancialProfile: jest.fn(),
      recordDisclaimerAcceptance: jest.fn(),
      completeOnboarding: jest.fn(),
    };

    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByVerificationToken: jest.fn(),
      create: jest.fn(),
      updateEmailVerified: jest.fn(),
      updateOnboardingCompleted: jest.fn(),
      saveVerificationToken: jest.fn(),
      savePasswordResetToken: jest.fn(),
      findByPasswordResetToken: jest.fn(),
      updatePasswordAndRevokeSessions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PROFILE_REPOSITORY, useValue: mockProfileRepo },
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  describe("getFullProfile", () => {
    it("debe devolver el perfil unificado cuando el usuario existe", async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockProfileRepo.getFullProfile.mockResolvedValue({
        profile: mockUserProfile,
        financialProfile: mockFinancialProfile,
        disclaimerLog: mockDisclaimerLog,
        onboardingCompleted: false,
      });

      const result = await service.getFullProfile("usr-1");

      expect(result.userId).toBe("usr-1");
      expect(result.email).toBe("test@finanzia.com");
      expect(result.profile?.usageGoals).toEqual([
        "control_expenses",
        "ai_budget_optimization",
      ]);
      expect(result.financialProfile?.profession).toBe("Ingeniero de Software");
      expect(result.financialProfile?.hasCryptoInvestments).toBe(true);
      expect(result.disclaimerLog?.termsAccepted).toBe(true);
    });

    it("debe devolver campos nulos si el usuario no tiene perfil o disclaimers registrados aún", async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockProfileRepo.getFullProfile.mockResolvedValue({
        profile: null,
        financialProfile: null,
        disclaimerLog: null,
        onboardingCompleted: false,
      });

      const result = await service.getFullProfile("usr-1");

      expect(result.userId).toBe("usr-1");
      expect(result.profile).toBeNull();
      expect(result.financialProfile).toBeNull();
      expect(result.disclaimerLog).toBeNull();
      expect(result.onboardingCompleted).toBe(false);
    });

    it("debe lanzar UserNotFoundException si el usuario no existe", async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.getFullProfile("unknown-usr")).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe("updateProfile", () => {
    it("debe actualizar los objetivos del perfil y divisa", async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockProfileRepo.upsertUserProfile.mockResolvedValue(mockUserProfile);

      const result = await service.updateProfile("usr-1", {
        usageGoals: ["control_expenses"],
        customGoal: "Mi meta",
        preferredCurrency: "EUR",
      });

      expect(result.usageGoals).toEqual([
        "control_expenses",
        "ai_budget_optimization",
      ]);
      expect(mockProfileRepo.upsertUserProfile).toHaveBeenCalledWith("usr-1", {
        usageGoals: ["control_expenses"],
        customGoal: "Mi meta",
        preferredCurrency: "EUR",
      });
    });

    it("debe lanzar UserNotFoundException si el usuario no existe al actualizar perfil", async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateProfile("unknown-usr", {
          usageGoals: ["control_expenses"],
        }),
      ).rejects.toThrow(UserNotFoundException);
    });
  });

  describe("updateFinancialProfile", () => {
    it("debe actualizar el perfil económico y activos correctamente", async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockProfileRepo.upsertFinancialProfile.mockResolvedValue(
        mockFinancialProfile,
      );

      const result = await service.updateFinancialProfile("usr-1", {
        profession: "Ingeniero de Software",
        annualGrossIncome: "30000-50000",
        hasStockInvestments: true,
        hasCryptoInvestments: true,
        hasRealEstateIncome: false,
      });

      expect(result.profession).toBe("Ingeniero de Software");
      expect(result.hasStockInvestments).toBe(true);
    });

    it("debe lanzar UserNotFoundException si el usuario no existe al actualizar perfil financiero", async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateFinancialProfile("unknown-usr", {
          profession: "Abogado",
        }),
      ).rejects.toThrow(UserNotFoundException);
    });
  });

  describe("completeOnboarding", () => {
    it("debe completar el onboarding atómicamente y crear la primera cuenta manual", async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockProfileRepo.completeOnboarding.mockResolvedValue({
        profile: mockUserProfile,
        financialProfile: mockFinancialProfile,
        disclaimerLog: mockDisclaimerLog,
        account: mockAccount,
      });

      const result = await service.completeOnboarding("usr-1", {
        usageGoals: ["control_expenses"],
        termsAccepted: true,
        accountName: "Cuenta Nómina BBVA",
        accountType: AccountType.CHECKING,
        initialBalanceCents: 150000,
        currency: "EUR",
      });

      expect(result.success).toBe(true);
      expect(result.onboardingCompleted).toBe(true);
      expect(result.account.name).toBe("Cuenta Nómina BBVA");
      expect(result.account.initialBalanceCents).toBe(150000);
      expect(mockProfileRepo.completeOnboarding).toHaveBeenCalled();
    });

    it("debe permitir completar onboarding omitiendo el perfil financiero opcional (Paso 2)", async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockProfileRepo.completeOnboarding.mockResolvedValue({
        profile: mockUserProfile,
        financialProfile: null,
        disclaimerLog: mockDisclaimerLog,
        account: mockAccount,
      });

      const result = await service.completeOnboarding("usr-1", {
        usageGoals: ["control_expenses"],
        termsAccepted: true,
        accountName: "Billetera Efectivo",
        accountType: AccountType.CASH,
        initialBalanceCents: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.onboardingCompleted).toBe(true);
      expect(mockProfileRepo.completeOnboarding).toHaveBeenCalledWith(
        "usr-1",
        expect.objectContaining({
          financialProfile: expect.objectContaining({
            profession: undefined,
            annualGrossIncome: undefined,
          }),
        }),
      );
    });

    it("debe lanzar UserNotFoundException si el usuario no existe", async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.completeOnboarding("unknown-usr", {
          usageGoals: ["control_expenses"],
          termsAccepted: true,
          accountName: "Efectivo",
          accountType: AccountType.CASH,
          initialBalanceCents: 0,
        }),
      ).rejects.toThrow(UserNotFoundException);
    });

    it("debe rechazar si termsAccepted es falso", async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);

      await expect(
        service.completeOnboarding("usr-1", {
          usageGoals: ["control_expenses"],
          termsAccepted: false,
          accountName: "Efectivo",
          accountType: AccountType.CASH,
          initialBalanceCents: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("debe rechazar si el usuario ya completó el onboarding previamente", async () => {
      const alreadyCompletedUser = new UserEntity(
        "usr-1",
        "test@finanzia.com",
        "hashed_password",
        "Miguel",
        "García",
        "EUR",
        new Date(),
        new Date(),
        true,
        true,
      );
      mockUserRepo.findById.mockResolvedValue(alreadyCompletedUser);

      await expect(
        service.completeOnboarding("usr-1", {
          usageGoals: ["control_expenses"],
          termsAccepted: true,
          accountName: "Efectivo",
          accountType: AccountType.CASH,
          initialBalanceCents: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getOnboardingStatus", () => {
    it("debe retornar false si el onboarding está pendiente", async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const status = await service.getOnboardingStatus("usr-1");
      expect(status.onboardingCompleted).toBe(false);
    });

    it("debe retornar true si el onboarding ya fue completado", async () => {
      const completedUser = new UserEntity(
        "usr-2",
        "completed@finanzia.com",
        "hash",
        "Ana",
        "López",
        "EUR",
        new Date(),
        new Date(),
        true,
        true,
      );
      mockUserRepo.findById.mockResolvedValue(completedUser);

      const status = await service.getOnboardingStatus("usr-2");
      expect(status.onboardingCompleted).toBe(true);
    });

    it("debe lanzar UserNotFoundException si el usuario no existe al consultar estado", async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.getOnboardingStatus("unknown-usr")).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });
});
