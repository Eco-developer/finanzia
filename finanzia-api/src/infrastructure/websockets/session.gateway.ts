import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger, Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ISessionNotifierPort } from "../../core/application/ports/session-notifier.port";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../core/domain/repositories/user.repository.interface";
import {
  ISessionRepository,
  SESSION_REPOSITORY,
} from "../../core/domain/repositories/session.repository.interface";

@Injectable()
@WebSocketGateway({
  namespace: "/ws/session",
  cors: {
    origin: true,
    credentials: true,
  },
})
export class SessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect, ISessionNotifierPort
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SessionGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(
          `[WS Handshake] Conexión rechazada: token no provisto (socketId: ${client.id})`,
        );
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findById(payload.sub);

      if (
        !user ||
        (payload.tokenVersion !== undefined &&
          user.tokenVersion !== undefined &&
          payload.tokenVersion < user.tokenVersion)
      ) {
        this.logger.warn(
          `[WS Handshake] Conexión rechazada: usuario inexistente o sesión revocada (userId: ${payload?.sub})`,
        );
        client.disconnect(true);
        return;
      }

      client.data.userId = user.id;
      client.data.email = user.email;

      await client.join(`user_${user.id}`);
      this.logger.log(
        `[WS Handshake] Cliente autenticado y conectado (userId: ${user.id}, socketId: ${client.id})`,
      );

      client.emit("session:connected", {
        status: "authenticated",
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      this.logger.warn(
        `[WS Handshake] Error de validación en handshake: ${err.message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `[WS Disconnect] Cliente desconectado (socketId: ${client.id}, userId: ${client.data?.userId})`,
    );
  }

  @SubscribeMessage("session:ping")
  async handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() _data?: any,
  ) {
    const userId = client.data?.userId;
    if (!userId) {
      client.emit("session:error", { message: "No autenticado" });
      client.disconnect(true);
      return;
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      client.emit("session:revoked", { reason: "User not found" });
      client.disconnect(true);
      return;
    }

    client.emit("session:pong", {
      timestamp: new Date().toISOString(),
      active: true,
    });
  }

  async notifySessionRevoked(
    userId: string,
    sessionId?: string,
  ): Promise<void> {
    if (!this.server) return;
    this.logger.log(
      `[WS Broadcast] Notificando revocación de sesión a usuario ${userId}`,
    );
    this.server.to(`user_${userId}`).emit("session:revoked", {
      userId,
      sessionId,
      reason: "Sesión cerrada por el usuario o token revocado",
      timestamp: new Date().toISOString(),
    });
  }

  async notifyAllSessionsRevoked(userId: string): Promise<void> {
    if (!this.server) return;
    this.logger.log(
      `[WS Broadcast] Notificando revocación de TODAS las sesiones a usuario ${userId}`,
    );
    this.server.to(`user_${userId}`).emit("session:revoked_all", {
      userId,
      reason: "Todas las sesiones activas han sido revocadas por seguridad",
      timestamp: new Date().toISOString(),
    });
  }

  async notifyTokenExpiring(userId: string): Promise<void> {
    if (!this.server) return;
    this.server.to(`user_${userId}`).emit("session:token_expiring", {
      userId,
      message: "Tu token de acceso está próximo a caducar",
      timestamp: new Date().toISOString(),
    });
  }

  private extractToken(client: Socket): string | null {
    // 1. Auth payload en handshake
    if (client.handshake?.auth?.token) {
      return client.handshake.auth.token;
    }

    // 2. Query param
    if (
      client.handshake?.query?.token &&
      typeof client.handshake.query.token === "string"
    ) {
      return client.handshake.query.token;
    }

    // 3. Cookie en headers
    const cookieHeader = client.handshake?.headers?.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
        const [k, v] = cookie.trim().split("=");
        if (k && v) acc[k] = decodeURIComponent(v);
        return acc;
      }, {} as Record<string, string>);

      if (cookies["jwt_token"]) return cookies["jwt_token"];
      if (cookies["auth_token"]) return cookies["auth_token"];
    }

    // 4. Authorization header
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }

    return null;
  }
}
