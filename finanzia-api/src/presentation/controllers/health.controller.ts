import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Verificación del estado del servicio backend" })
  @ApiResponse({
    status: 200,
    description: "Servicio operativo y saludable",
    schema: {
      example: {
        status: "ok",
        service: "finanzia-api",
        timestamp: "2026-09-13T10:00:00.000Z",
        version: "0.1.0",
      },
    },
  })
  check() {
    return {
      status: "ok",
      service: "finanzia-api",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    };
  }
}
