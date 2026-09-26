import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { APP_FILTER } from "@nestjs/core";

// Infrastructure
import { PrismaService } from "./infrastructure/database/prisma.service";
import { PrismaUserRepository } from "./infrastructure/database/repositories/prisma-user.repository";
import { PrismaAccountRepository } from "./infrastructure/database/repositories/prisma-account.repository";
import { PrismaCategoryRepository } from "./infrastructure/database/repositories/prisma-category.repository";
import { PrismaTransactionRepository } from "./infrastructure/database/repositories/prisma-transaction.repository";
import { PrismaCsvTemplateRepository } from "./infrastructure/database/repositories/prisma-csv-template.repository";
import { PrismaBudgetRepository } from "./infrastructure/database/repositories/prisma-budget.repository";
import { PrismaSavingsGoalRepository } from "./infrastructure/database/repositories/prisma-savings-goal.repository";
import { PrismaAiRecommendationRepository } from "./infrastructure/database/repositories/prisma-ai-recommendation.repository";
import { PrismaAdvisorHistoryRepository } from "./infrastructure/database/repositories/prisma-advisor-history.repository";
import { PrismaFinancialAnalyticsAdapter } from "./infrastructure/database/repositories/prisma-financial-analytics.adapter";
import { HashingService } from "./infrastructure/security/hashing.service";
import { JwtStrategy } from "./infrastructure/security/jwt.strategy";

// Ports & Tokens
import { USER_REPOSITORY } from "./core/domain/repositories/user.repository.interface";
import { ACCOUNT_REPOSITORY } from "./core/domain/repositories/account.repository.interface";
import { CATEGORY_REPOSITORY } from "./core/domain/repositories/category.repository.interface";
import { TRANSACTION_REPOSITORY } from "./core/domain/repositories/transaction.repository.interface";
import { CSV_TEMPLATE_REPOSITORY } from "./core/domain/repositories/csv-template.repository.interface";
import { BUDGET_REPOSITORY } from "./core/domain/repositories/budget.repository.interface";
import { SAVINGS_GOAL_REPOSITORY } from "./core/domain/repositories/savings-goal.repository.interface";
import { AI_RECOMMENDATION_REPOSITORY } from "./core/domain/repositories/ai-recommendation.repository.interface";
import { ADVISOR_HISTORY_REPOSITORY } from "./core/domain/repositories/advisor-history.repository.interface";
import { FINANCIAL_ANALYTICS_PORT } from "./core/application/ports/financial-analytics.port";
import { HASHING_SERVICE } from "./core/application/ports/hashing.port";
import { AI_ADVISOR_PORT } from "./core/application/ports/ai-advisor.port";
import { EMAIL_PORT } from "./core/application/ports/email.port";
import { NodemailerEmailAdapter } from "./infrastructure/email/nodemailer-email.adapter";

// Application
import { AuthService } from "./core/application/auth/auth.service";
import { AccountsService } from "./core/application/accounts/accounts.service";
import { CategoriesService } from "./core/application/categories/categories.service";
import { TransactionsService } from "./core/application/transactions/transactions.service";
import { ImportsService } from "./core/application/imports/imports.service";
import { BudgetsService } from "./core/application/budgets/budgets.service";
import { GoalsService } from "./core/application/goals/goals.service";
import { AiToolsService } from "./core/application/ai/ai-tools.service";
import { GeminiAdvisorService } from "./infrastructure/ai/gemini-advisor.service";
import { AiAdvisorService } from "./core/application/ai/ai-advisor.service";
import { FinancialProfileService } from "./core/application/ai/financial-profile.service";
import { MultiStepPlannerService } from "./core/application/ai/multi-step-planner.service";
import { TransactionLearningService } from "./core/application/ai/transaction-learning.service";
import { RecommendationsService } from "./core/application/recommendations/recommendations.service";

// Presentation
import { HealthController } from "./presentation/controllers/health.controller";
import { AuthController } from "./presentation/controllers/auth.controller";
import { AccountsController } from "./presentation/controllers/accounts.controller";
import { CategoriesController } from "./presentation/controllers/categories.controller";
import { TransactionsController } from "./presentation/controllers/transactions.controller";
import { ImportsController } from "./presentation/controllers/imports.controller";
import { BudgetsController } from "./presentation/controllers/budgets.controller";
import { GoalsController } from "./presentation/controllers/goals.controller";
import { AdvisorController } from "./presentation/controllers/advisor.controller";
import { RecommendationsController } from "./presentation/controllers/recommendations.controller";
import { GlobalExceptionFilter } from "./presentation/filters/global-exception.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>("JWT_SECRET") ||
          "dev_jwt_secret_finanzia_super_secure_32_chars",
        signOptions: {
          expiresIn: "7d",
        },
      }),
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    AccountsController,
    CategoriesController,
    TransactionsController,
    ImportsController,
    BudgetsController,
    GoalsController,
    AdvisorController,
    RecommendationsController,
  ],
  providers: [
    PrismaService,
    PrismaUserRepository,
    PrismaAccountRepository,
    PrismaCategoryRepository,
    PrismaTransactionRepository,
    PrismaCsvTemplateRepository,
    PrismaBudgetRepository,
    PrismaSavingsGoalRepository,
    PrismaAiRecommendationRepository,
    PrismaAdvisorHistoryRepository,
    PrismaFinancialAnalyticsAdapter,
    HashingService,
    JwtStrategy,
    // Bindings de Puertos e Interfaces (Hexagonal Architecture / DIP)
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
    { provide: TRANSACTION_REPOSITORY, useClass: PrismaTransactionRepository },
    { provide: CSV_TEMPLATE_REPOSITORY, useClass: PrismaCsvTemplateRepository },
    { provide: BUDGET_REPOSITORY, useClass: PrismaBudgetRepository },
    { provide: SAVINGS_GOAL_REPOSITORY, useClass: PrismaSavingsGoalRepository },
    {
      provide: AI_RECOMMENDATION_REPOSITORY,
      useClass: PrismaAiRecommendationRepository,
    },
    {
      provide: ADVISOR_HISTORY_REPOSITORY,
      useClass: PrismaAdvisorHistoryRepository,
    },
    {
      provide: FINANCIAL_ANALYTICS_PORT,
      useClass: PrismaFinancialAnalyticsAdapter,
    },
    { provide: HASHING_SERVICE, useClass: HashingService },
    { provide: AI_ADVISOR_PORT, useClass: GeminiAdvisorService },
    { provide: EMAIL_PORT, useClass: NodemailerEmailAdapter },
    // Application Services
    AuthService,
    AccountsService,
    CategoriesService,
    TransactionsService,
    ImportsService,
    BudgetsService,
    GoalsService,
    AiToolsService,
    GeminiAdvisorService,
    AiAdvisorService,
    FinancialProfileService,
    MultiStepPlannerService,
    TransactionLearningService,
    RecommendationsService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [
    PrismaService,
    USER_REPOSITORY,
    ACCOUNT_REPOSITORY,
    CATEGORY_REPOSITORY,
    TRANSACTION_REPOSITORY,
    CSV_TEMPLATE_REPOSITORY,
    BUDGET_REPOSITORY,
    SAVINGS_GOAL_REPOSITORY,
    AI_RECOMMENDATION_REPOSITORY,
    ADVISOR_HISTORY_REPOSITORY,
    FINANCIAL_ANALYTICS_PORT,
    HASHING_SERVICE,
    AI_ADVISOR_PORT,
    EMAIL_PORT,
    AuthService,
    AccountsService,
    CategoriesService,
    TransactionsService,
    ImportsService,
    BudgetsService,
    GoalsService,
    AiToolsService,
    GeminiAdvisorService,
    AiAdvisorService,
    FinancialProfileService,
    MultiStepPlannerService,
    TransactionLearningService,
    RecommendationsService,
  ],
})
export class AppModule {}
