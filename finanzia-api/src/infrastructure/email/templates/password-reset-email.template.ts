export function renderPasswordResetEmail(
  firstName: string,
  resetLink: string,
  expiresInMinutes: number = 30,
): { html: string; text: string } {
  const text =
    `Hola ${firstName},\n\n` +
    `Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en FinanZIA.\n\n` +
    `Para crear una nueva contraseña, por favor pulsa el siguiente enlace:\n\n` +
    `${resetLink}\n\n` +
    `⏱️ Este enlace caduca en ${expiresInMinutes} minutos y solo puede utilizarse una vez.\n` +
    `Si tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura. Tu contraseña actual permanecerá intacta.\n\n` +
    `El equipo de FinanZIA`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablece tu contraseña en FinanZIA</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0b0e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e4e4e7;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0b0e;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background: #141418;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      padding: 32px 32px 24px;
      text-align: center;
      background: linear-gradient(180deg, rgba(99, 102, 241, 0.12) 0%, rgba(20, 20, 24, 0) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .logo {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      text-decoration: none;
    }
    .logo span {
      color: #818cf8;
    }
    .content {
      padding: 32px;
      line-height: 1.6;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px;
    }
    p {
      margin: 0 0 16px;
      color: #a1a1aa;
      font-size: 15px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: #ffffff !important;
      padding: 14px 32px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
    }
    .security-notice {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 8px;
      padding: 12px 16px;
      margin: 20px 0;
      font-size: 13px;
      color: #fbbf24;
    }
    .fallback-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 14px;
      word-break: break-all;
      font-size: 12px;
      color: #71717a;
      margin-top: 24px;
    }
    .footer {
      padding: 24px 32px;
      background: #0f0f13;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      text-align: center;
      font-size: 12px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">⚡ Finan<span>ZIA</span></div>
      </div>
      <div class="content">
        <h1>¡Hola, ${firstName}!</h1>
        <p>Hemos recibido una solicitud para restablecer la contraseña asociada a tu cuenta de <strong>FinanZIA</strong>.</p>
        <p>Para establecer una nueva contraseña de acceso, haz clic en el botón a continuación:</p>
        
        <div class="btn-container">
          <a href="${resetLink}" class="btn" target="_blank">Restablecer mi contraseña</a>
        </div>

        <div class="security-notice">
          ⏱️ <strong>Aviso de seguridad:</strong> Este enlace caducará en <strong>${expiresInMinutes} minutos</strong> y quedará invalidado inmediatamente tras su primer uso.
        </div>

        <p style="font-size: 13px; color: #71717a;">
          Si tú no has solicitado este restablecimiento, ignora este correo de forma segura. Tu contraseña actual no sufrirá ningún cambio.
        </p>

        <div class="fallback-box">
          Si el botón no funciona, copia y pega el siguiente enlace directamente en tu navegador:<br>
          <a href="${resetLink}" style="color: #818cf8;">${resetLink}</a>
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} FinanZIA. Plataforma de Finanzas Personales Seguras con IA.
      </div>
    </div>
  </div>
</body>
</html>`;

  return { html, text };
}
