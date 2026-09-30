import { Test, TestingModule } from "@nestjs/testing";
import { ProfileController } from "../../src/presentation/controllers/profile.controller";
import { ProfileService } from "../../src/core/application/profile/profile.service";
import { AuthenticatedUser } from "../../src/presentation/decorators/current-user.decorator";
import { FinancialExperienceLevel } from "@prisma/client";

describe("ProfileController", () => {
  let controller: ProfileController;
  let mockProfileService: Partial<Record<keyof ProfileService, jest.Mock>>;

  const mockUser: AuthenticatedUser = {
    id: "usr-1",
    email: "test@finanzia.com",
    firstName: "Carlos",
    lastName: "Gómez",
    defaultCurrency: "EUR",
  };

  beforeEach(async () => {
    mockProfileService = {
      getFullProfile: jest.fn(),
      updateProfile: jest.fn(),
      updateFinancialProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("getProfile", () => {
    it("debe delegar en ProfileService.getFullProfile con el id del usuario autenticado", async () => {
      const mockResult = {
        userId: "usr-1",
        email: "test@finanzia.com",
        firstName: "Carlos",
        lastName: "Gómez",
        emailVerified: true,
        onboardingCompleted: true,
        defaultCurrency: "EUR",
        profile: {
          usageGoals: ["control_expenses"],
          customGoal: undefined,
          preferredCurrency: "EUR",
          updatedAt: new Date(),
        },
        financialProfile: null,
        disclaimerLog: null,
      };

      mockProfileService.getFullProfile!.mockResolvedValue(mockResult);

      const result = await controller.getProfile(mockUser);

      expect(mockProfileService.getFullProfile).toHaveBeenCalledWith("usr-1");
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateProfile", () => {
    it("debe delegar en ProfileService.updateProfile con el dto correspondiente", async () => {
      const dto = {
        usageGoals: ["control_expenses", "ai_budget_optimization"],
        customGoal: "Plan de ahorro vivienda",
        preferredCurrency: "EUR",
      };

      const mockResponse = {
        ...dto,
        updatedAt: new Date(),
      };

      mockProfileService.updateProfile!.mockResolvedValue(mockResponse);

      const result = await controller.updateProfile(mockUser, dto);

      expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
        "usr-1",
        dto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateFinancialProfile", () => {
    it("debe delegar en ProfileService.updateFinancialProfile con el dto correspondiente", async () => {
      const dto = {
        profession: "Diseñador UX",
        annualGrossIncome: "30000-50000",
        hasRealEstateIncome: false,
        hasStockInvestments: true,
        hasCryptoInvestments: false,
        emergencyFundRange: "3-6m",
        experienceLevel: FinancialExperienceLevel.INTERMEDIATE,
      };

      const mockResponse = {
        ...dto,
        updatedAt: new Date(),
      };

      mockProfileService.updateFinancialProfile!.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.updateFinancialProfile(mockUser, dto);

      expect(mockProfileService.updateFinancialProfile).toHaveBeenCalledWith(
        "usr-1",
        dto,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
