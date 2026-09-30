import { Test, TestingModule } from "@nestjs/testing";
import { OnboardingController } from "../../src/presentation/controllers/onboarding.controller";
import { ProfileService } from "../../src/core/application/profile/profile.service";
import { AuthenticatedUser } from "../../src/presentation/decorators/current-user.decorator";
import { AccountType } from "@prisma/client";

describe("OnboardingController", () => {
  let controller: OnboardingController;
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
      getOnboardingStatus: jest.fn(),
      completeOnboarding: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [
        {
          provide: ProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();

    controller = module.get<OnboardingController>(OnboardingController);
  });

  it("debe estar definido", () => {
    expect(controller).toBeDefined();
  });

  describe("getStatus", () => {
    it("debe delegar en ProfileService.getOnboardingStatus con el id del usuario", async () => {
      mockProfileService.getOnboardingStatus!.mockResolvedValue({
        onboardingCompleted: false,
      });

      const result = await controller.getStatus(mockUser);

      expect(mockProfileService.getOnboardingStatus).toHaveBeenCalledWith("usr-1");
      expect(result).toEqual({ onboardingCompleted: false });
    });
  });

  describe("complete", () => {
    it("debe delegar en ProfileService.completeOnboarding con el id del usuario y dto", async () => {
      const dto = {
        usageGoals: ["control_expenses"],
        termsAccepted: true,
        accountName: "Cuenta Nómina",
        accountType: AccountType.CHECKING,
        initialBalanceCents: 100000,
        currency: "EUR",
      };

      const mockResponse = {
        success: true,
        message: "Onboarding completado con éxito",
        onboardingCompleted: true,
        account: {
          id: "acc-1",
          name: "Cuenta Nómina",
          type: AccountType.CHECKING,
          currency: "EUR",
          initialBalanceCents: 100000,
          currentBalanceCents: 100000,
        },
      };

      mockProfileService.completeOnboarding!.mockResolvedValue(mockResponse);

      const result = await controller.complete(mockUser, dto);

      expect(mockProfileService.completeOnboarding).toHaveBeenCalledWith(
        "usr-1",
        dto,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
