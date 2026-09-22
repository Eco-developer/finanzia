export interface SendVerificationEmailParams {
  to: string;
  firstName: string;
  verificationLink: string;
}

export interface IEmailPort {
  sendVerificationEmail(params: SendVerificationEmailParams): Promise<boolean>;
}

export const EMAIL_PORT = Symbol("IEmailPort");
