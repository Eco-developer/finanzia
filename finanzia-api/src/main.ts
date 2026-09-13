import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

// Soporte de serialización BigInt en JSON para evitar TypeErrors en NestJS/Express
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const logger = new Logger("FinanZiaBootstrap");
  const app = await NestFactory.create(AppModule);

  // Prefijo global de la API
  app.setGlobalPrefix("api");

  // Cabeceras de seguridad HTTP
  app.use(helmet());

  // Parser de cookies para gestión segura de JWT
  app.use(cookieParser());

  // Configuración de CORS estricto
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Tubería global de validación y transformación de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // Documentación Interactiva Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle("FinanZIA API")
    .setDescription(
      "Documentación interactiva de la API de FinanZIA: finanzas personales con IA determinista, importación de extractos bancarios y arquitectura hexagonal.",
    )
    .setVersion("0.1.0")
    .addTag("Health", "Verificación de salud y estado del sistema")
    .addTag("Auth", "Autenticación y gestión de sesiones con cookies HttpOnly")
    .addTag("Accounts", "Gestión de cuentas financieras")
    .addTag("Transactions", "Registro de ingresos, gastos y transferencias")
    .addTag("Budgets", "Control presupuestario mensual")
    .addTag("Goals", "Objetivos y metas de ahorro")
    .addTag("Imports", "Motor de carga y conciliación CSV con deduplicación")
    .addTag("Advisor", "Asistente de IA (Gemini) con Tool Calling determinista")
    .addBearerAuth({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description: "Token JWT obtenido en login/register",
    })
    .addCookieAuth("jwt_token", {
      type: "apiKey",
      in: "cookie",
      name: "jwt_token",
      description:
        "Cookie de sesión HttpOnly con JWT emitido en /api/auth/login",
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 FinanZIA API escuchando en: http://localhost:${port}/api`);
  logger.log(
    `📖 Documentación Swagger disponible en: http://localhost:${port}/api/docs`,
  );
}

bootstrap();
