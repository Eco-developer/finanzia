export interface ISessionNotifierPort {
  notifySessionRevoked(userId: string, sessionId?: string): Promise<void>;
  notifyAllSessionsRevoked(userId: string): Promise<void>;
  notifyTokenExpiring?(userId: string): Promise<void>;
}

export const SESSION_NOTIFIER_PORT = Symbol("ISessionNotifierPort");
