import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { PrismaUserRepository } from "../database/repositories/prisma-user.repository";

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    configService: ConfigService,
    private readonly userRepository: PrismaUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Extract from standard cookie 'jwt_token' (defined in api-contracts.md)
        (req: Request) => req?.cookies?.["jwt_token"] || null,
        // 2. Extract from fallback cookie 'auth_token'
        (req: Request) => req?.cookies?.["auth_token"] || null,
        // 3. Extract from Authorization: Bearer <token> header (Swagger UI / API clients)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>("JWT_SECRET") ||
        "dev_jwt_secret_finanzia_super_secure_32_chars",
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        "El token no corresponde a ningún usuario válido",
      );
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      defaultCurrency: user.defaultCurrency,
    };
  }
}
