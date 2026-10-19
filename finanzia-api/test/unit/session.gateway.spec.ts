import { SessionGateway } from "../../src/infrastructure/websockets/session.gateway";
import { UserEntity } from "../../src/core/domain/entities/user.entity";

describe("SessionGateway (Unit Tests)", () => {
  let gateway: SessionGateway;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockUserRepository: any;
  let mockSessionRepository: any;
  let mockServer: any;
  let mockSocket: any;

  const mockUser = new UserEntity(
    "user-uuid-1",
    "test@example.com",
    "hashed_password_123",
    "Juan",
    "Pérez",
    "EUR",
    new Date(),
    new Date(),
    true,
    true,
    1, // tokenVersion = 1
  );

  beforeEach(() => {
    mockJwtService = {
      verify: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue("dev_jwt_secret"),
    };

    mockUserRepository = {
      findById: jest.fn(),
    };

    mockSessionRepository = {
      findByTokenHash: jest.fn(),
    };

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    mockSocket = {
      id: "socket-id-123",
      data: {},
      handshake: {
        auth: {},
        query: {},
        headers: {},
      },
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    gateway = new SessionGateway(
      mockJwtService,
      mockConfigService,
      mockUserRepository,
      mockSessionRepository,
    );
    gateway.server = mockServer;
  });

  describe("handleConnection (Handshake Autenticado)", () => {
    it("debe rechazar la conexión si no se provee ningún token", async () => {
      mockSocket.handshake.auth = {};

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it("debe rechazar la conexión si JwtService.verify falla", async () => {
      mockSocket.handshake.auth = { token: "token-invalido" };
      mockJwtService.verify.mockImplementation(() => {
        throw new Error("Token expired");
      });

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it("debe rechazar la conexión si el usuario no existe", async () => {
      mockSocket.handshake.auth = { token: "token-valido" };
      mockJwtService.verify.mockReturnValue({
        sub: "user-uuid-1",
        tokenVersion: 1,
      });
      mockUserRepository.findById.mockResolvedValue(null);

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it("debe rechazar la conexión si el tokenVersion del payload es menor al del usuario (sesión revocada)", async () => {
      mockSocket.handshake.auth = { token: "token-valido" };
      mockJwtService.verify.mockReturnValue({
        sub: "user-uuid-1",
        tokenVersion: 1,
      });
      mockUserRepository.findById.mockResolvedValue({
        ...mockUser,
        tokenVersion: 2, // Usuario ya incrementó tokenVersion
      });

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it("debe autenticar exitosamente y unir el socket a la sala privada del usuario", async () => {
      mockSocket.handshake.auth = { token: "token-valido" };
      mockJwtService.verify.mockReturnValue({
        sub: "user-uuid-1",
        tokenVersion: 1,
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith("user_user-uuid-1");
      expect(mockSocket.data.userId).toBe("user-uuid-1");
      expect(mockSocket.emit).toHaveBeenCalledWith(
        "session:connected",
        expect.objectContaining({
          status: "authenticated",
          userId: "user-uuid-1",
        }),
      );
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it("debe extraer el token desde cookie si no viene en handshake.auth", async () => {
      mockSocket.handshake.headers = {
        cookie: "other_cookie=xyz; jwt_token=cookie-token-value; foo=bar",
      };
      mockJwtService.verify.mockReturnValue({
        sub: "user-uuid-1",
        tokenVersion: 1,
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await gateway.handleConnection(mockSocket);

      expect(mockJwtService.verify).toHaveBeenCalledWith("cookie-token-value");
      expect(mockSocket.join).toHaveBeenCalledWith("user_user-uuid-1");
    });
  });

  describe("handlePing (Heartbeat y Keep-Alive)", () => {
    it("debe responder session:pong si el usuario autenticado está activo", async () => {
      mockSocket.data = { userId: "user-uuid-1" };
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await gateway.handlePing(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        "session:pong",
        expect.objectContaining({ active: true }),
      );
    });

    it("debe desconectar si el socket no tiene userId en data", async () => {
      mockSocket.data = {};

      await gateway.handlePing(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        "session:error",
        expect.objectContaining({ message: "No autenticado" }),
      );
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it("debe emitir session:revoked y desconectar si el usuario ya no existe", async () => {
      mockSocket.data = { userId: "user-uuid-1" };
      mockUserRepository.findById.mockResolvedValue(null);

      await gateway.handlePing(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        "session:revoked",
        expect.objectContaining({ reason: "User not found" }),
      );
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe("Notificaciones y Difusión (ISessionNotifierPort)", () => {
    it("notifySessionRevoked debe emitir session:revoked a la sala del usuario", async () => {
      await gateway.notifySessionRevoked("user-uuid-1", "session-123");

      expect(mockServer.to).toHaveBeenCalledWith("user_user-uuid-1");
      expect(mockServer.emit).toHaveBeenCalledWith(
        "session:revoked",
        expect.objectContaining({
          userId: "user-uuid-1",
          sessionId: "session-123",
        }),
      );
    });

    it("notifyAllSessionsRevoked debe emitir session:revoked_all a la sala del usuario", async () => {
      await gateway.notifyAllSessionsRevoked("user-uuid-1");

      expect(mockServer.to).toHaveBeenCalledWith("user_user-uuid-1");
      expect(mockServer.emit).toHaveBeenCalledWith(
        "session:revoked_all",
        expect.objectContaining({
          userId: "user-uuid-1",
          reason: expect.any(String),
        }),
      );
    });

    it("notifyTokenExpiring debe emitir session:token_expiring a la sala del usuario", async () => {
      await gateway.notifyTokenExpiring("user-uuid-1");

      expect(mockServer.to).toHaveBeenCalledWith("user_user-uuid-1");
      expect(mockServer.emit).toHaveBeenCalledWith(
        "session:token_expiring",
        expect.objectContaining({
          userId: "user-uuid-1",
        }),
      );
    });
  });
});
