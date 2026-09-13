import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(
        "Conexión con PostgreSQL (Prisma) establecida correctamente.",
      );
    } catch (error) {
      this.logger.warn(
        "No se pudo conectar a PostgreSQL de forma inmediata. Verifica si el contenedor Docker de base de datos está activo.",
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Conexión con PostgreSQL desconectada.");
  }
}
