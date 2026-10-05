export interface SendVerificationEmailParams {
  to: string;
  firstName: string;
  verificationLink: string;
}

export interface SendPasswordResetEmailParams {
  to: string;
  firstName: string;
  resetLink: string;
  expiresInMinutes?: number;
}

export interface IEmailPort {
  sendVerificationEmail(params: SendVerificationEmailParams): Promise<boolean>;
  sendPasswordResetEmail(
    params: SendPasswordResetEmailParams,
  ): Promise<boolean>;
}

export const EMAIL_PORT = Symbol("IEmailPort");
