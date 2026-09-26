import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import {
  IEmailPort,
  SendVerificationEmailParams,
} from "../../core/application/ports/email.port";
import { renderVerificationEmail } from "./templates/verification-email.template";

@Injectable()
export class NodemailerEmailAdapter implements IEmailPort {
  private readonly logger = new Logger(NodemailerEmailAdapter.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("SMTP_HOST") || "localhost";
    const port = parseInt(
      this.configService.get<string>("SMTP_PORT") || "1025",
      10,
    );
    const user = this.configService.get<string>("SMTP_USER") || "";
    const pass = this.configService.get<string>("SMTP_PASS") || "";
    const secure =
      this.configService.get<string>("SMTP_SECURE") === "true" || port === 465;

    this.fromAddress =
      this.configService.get<string>("SMTP_FROM") ||
      "FinanZIA <noreply@finanzia.local>";

    const transportOptions: nodemailer.TransportOptions = {
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    } as any;

    this.transporter = nodemailer.createTransport(transportOptions);
    this.logger.log(
      `Adaptador Nodemailer configurado con SMTP ${host}:${port} (Remitente: ${this.fromAddress})`,
    );
  }

  async sendVerificationEmail(
    params: SendVerificationEmailParams,
  ): Promise<boolean> {
    const { to, firstName, verificationLink } = params;
    const { html, text } = renderVerificationEmail(firstName, verificationLink);

    try {
      this.logger.log(
        `[Email] Enviando correo de verificación a ${to}... (Enlace: ${verificationLink})`,
      );

      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: "⚡ Verifica tu correo electrónico en FinanZIA",
        text,
        html,
      });

      this.logger.log(
        `[Email] Correo de verificación entregado a ${to}. ID: ${info.messageId}`,
      );
      return true;
    } catch (error: any) {
      this.logger.warn(
        `[Email] No se pudo enviar el correo vía SMTP (${error?.message || error}). Enlace de respaldo: ${verificationLink}`,
      );
      // En modo local/pruebas, no bloquear el flujo de registro si el servidor SMTP no está accesible
      return false;
    }
  }
}
