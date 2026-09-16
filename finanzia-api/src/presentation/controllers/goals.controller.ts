import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiParam,
} from "@nestjs/swagger";
import { GoalsService } from "../../core/application/goals/goals.service";
import { CreateGoalDto } from "../dtos/goals/create-goal.dto";
import { UpdateGoalDto } from "../dtos/goals/update-goal.dto";
import { ContributeGoalDto } from "../dtos/goals/contribute-goal.dto";
import { GoalResponseDto } from "../dtos/goals/goal-response.dto";
import { JwtAuthGuard } from "../../infrastructure/security/guards/jwt-auth.guard";
import {
  CurrentUser,
  AuthenticatedUser,
} from "../decorators/current-user.decorator";

@ApiTags("Goals")
@ApiBearerAuth()
@ApiCookieAuth("jwt_token")
@UseGuards(JwtAuthGuard)
@Controller("goals")
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Crear un nuevo objetivo o meta de ahorro",
  })
  @ApiResponse({
    status: 201,
    description: "Meta de ahorro creada exitosamente",
    type: GoalResponseDto,
  })
  async createGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGoalDto,
  ) {
    const goal = await this.goalsService.createGoal(user.id, dto);
    return {
      success: true,
      data: goal,
    };
  }

  @Get()
  @ApiOperation({
    summary: "Listar todas las metas de ahorro del usuario",
  })
  @ApiResponse({
    status: 200,
    description: "Lista de metas obtenida",
    type: [GoalResponseDto],
  })
  async getGoals(@CurrentUser() user: AuthenticatedUser) {
    const goals = await this.goalsService.getGoals(user.id);
    return {
      success: true,
      data: goals,
    };
  }

  @Get(":id")
  @ApiOperation({
    summary: "Obtener detalle de una meta de ahorro",
  })
  @ApiParam({ name: "id", description: "UUID de la meta" })
  async getGoalById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const goal = await this.goalsService.getGoalById(user.id, id);
    return {
      success: true,
      data: goal,
    };
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Modificar nombre, objetivo o fecha de una meta",
  })
  @ApiParam({ name: "id", description: "UUID de la meta" })
  async updateGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    const updated = await this.goalsService.updateGoal(user.id, id, dto);
    return {
      success: true,
      data: updated,
    };
  }

  @Post(":id/contribute")
  @ApiOperation({
    summary: "Realizar una aportación incremental a la meta de ahorro",
    description:
      "Incrementa el saldo acumulado en céntimos y marca como completada automáticamente si se alcanza el objetivo.",
  })
  @ApiParam({ name: "id", description: "UUID de la meta" })
  async contribute(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ContributeGoalDto,
  ) {
    const updated = await this.goalsService.contributeToGoal(user.id, id, dto);
    return {
      success: true,
      data: updated,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Eliminar una meta de ahorro",
  })
  @ApiParam({ name: "id", description: "UUID de la meta" })
  async deleteGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.goalsService.deleteGoal(user.id, id);
  }
}
