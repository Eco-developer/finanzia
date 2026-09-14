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
import { HashingService } from "./infrastructure/security/hashing.service";
import { JwtStrategy } from "./infrastructure/security/jwt.strategy";

// Application
import { AuthService } from "./core/application/auth/auth.service";
import { AccountsService } from "./core/application/accounts/accounts.service";
import { CategoriesService } from "./core/application/categories/categories.service";
import { TransactionsService } from "./core/application/transactions/transactions.service";
import { ImportsService } from "./core/application/imports/imports.service";

// Presentation
import { HealthController } from "./presentation/controllers/health.controller";
import { AuthController } from "./presentation/controllers/auth.controller";
import { AccountsController } from "./presentation/controllers/accounts.controller";
import { CategoriesController } from "./presentation/controllers/categories.controller";
import { TransactionsController } from "./presentation/controllers/transactions.controller";
import { ImportsController } from "./presentation/controllers/imports.controller";
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
  ],
  providers: [
    PrismaService,
    PrismaUserRepository,
    PrismaAccountRepository,
    PrismaCategoryRepository,
    PrismaTransactionRepository,
    PrismaCsvTemplateRepository,
    HashingService,
    JwtStrategy,
    AuthService,
    AccountsService,
    CategoriesService,
    TransactionsService,
    ImportsService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [
    PrismaService,
    PrismaUserRepository,
    PrismaAccountRepository,
    PrismaCategoryRepository,
    PrismaTransactionRepository,
    PrismaCsvTemplateRepository,
    AuthService,
    AccountsService,
    CategoriesService,
    TransactionsService,
    ImportsService,
  ],
})
export class AppModule {}
