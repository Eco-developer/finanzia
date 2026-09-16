import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { GoalsService } from "../../src/core/application/goals/goals.service";
import { SavingsGoalEntity } from "../../src/core/domain/entities/savings-goal.entity";

describe("GoalsService (Unit Tests)", () => {
  let goalsService: GoalsService;
  let mockGoalRepository: any;

  const mockGoal = new SavingsGoalEntity(
    "goal-uuid-1",
    "user-1",
    "Vacaciones en Japón",
    200000n,
    50000n,
    new Date("2027-01-01T00:00:00.000Z"),
    false,
    new Date(),
    new Date(),
  );

  beforeEach(() => {
    mockGoalRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      update: jest.fn(),
      addContribution: jest.fn(),
      delete: jest.fn(),
    };

    goalsService = new GoalsService(mockGoalRepository);
  });

  describe("createGoal", () => {
    it("debe crear una meta de ahorro correctamente", async () => {
      mockGoalRepository.create.mockResolvedValue(mockGoal);

      const result = await goalsService.createGoal("user-1", {
        name: "Vacaciones en Japón",
        targetAmountCents: 200000,
        currentAmountCents: 50000,
        targetDate: "2027-01-01T00:00:00.000Z",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("goal-uuid-1");
      expect(result.targetAmountCents).toBe(200000);
      expect(result.currentAmountCents).toBe(50000);
      expect(result.progressPercentage).toBe(25);
      expect(mockGoalRepository.create).toHaveBeenCalled();
    });

    it("debe lanzar BadRequestException si la fecha objetivo es inválida", async () => {
      await expect(
        goalsService.createGoal("user-1", {
          name: "Meta",
          targetAmountCents: 10000,
          targetDate: "fecha-no-valida",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getGoals y getGoalById", () => {
    it("debe devolver las metas del usuario", async () => {
      mockGoalRepository.findAllByUserId.mockResolvedValue([mockGoal]);

      const result = await goalsService.getGoals("user-1");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Vacaciones en Japón");
    });

    it("debe lanzar NotFoundException si la meta no existe", async () => {
      mockGoalRepository.findById.mockResolvedValue(null);

      await expect(
        goalsService.getGoalById("user-1", "inexistente"),
      ).rejects.toThrow(NotFoundException);
    });

    it("debe lanzar ForbiddenException si la meta pertenece a otro usuario", async () => {
      mockGoalRepository.findById.mockResolvedValue(mockGoal);

      await expect(
        goalsService.getGoalById("user-intruso", "goal-uuid-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("contributeToGoal", () => {
    it("debe registrar la aportación y devolver la meta actualizada", async () => {
      mockGoalRepository.findById.mockResolvedValue(mockGoal);

      const updatedGoal = new SavingsGoalEntity(
        "goal-uuid-1",
        "user-1",
        "Vacaciones en Japón",
        200000n,
        150000n,
        new Date("2027-01-01T00:00:00.000Z"),
        false,
        new Date(),
        new Date(),
      );
      mockGoalRepository.addContribution.mockResolvedValue(updatedGoal);

      const result = await goalsService.contributeToGoal("user-1", "goal-uuid-1", {
        amountCents: 100000,
      });

      expect(result.currentAmountCents).toBe(150000);
      expect(result.progressPercentage).toBe(75);
      expect(mockGoalRepository.addContribution).toHaveBeenCalledWith(
        "goal-uuid-1",
        100000n,
      );
    });
  });

  describe("deleteGoal", () => {
    it("debe eliminar la meta si pertenece al usuario", async () => {
      mockGoalRepository.findById.mockResolvedValue(mockGoal);
      mockGoalRepository.delete.mockResolvedValue(undefined);

      await goalsService.deleteGoal("user-1", "goal-uuid-1");
      expect(mockGoalRepository.delete).toHaveBeenCalledWith("goal-uuid-1");
    });
  });
});
