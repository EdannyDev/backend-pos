require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendResetEmail = async ({ to, name, resetUrl }) => {
  const currentYear = new Date().getFullYear();
  const emailFrom = process.env.EMAIL_FROM;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden;">
        
        <tr>
          <td style="padding: 32px 32px 10px 32px; text-align: center;">
            <h1 style="color: #00ffc3; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Techno POS</h1>
          </td>
        </tr>

        <tr>
          <td style="padding: 20px 32px; color: #f8fafc;">
            <p style="font-size: 16px; line-height: 1.6; margin: 0;">Hola, <strong>${name}</strong>.</p>
            <p style="font-size: 15px; line-height: 1.6; color: #94a3b8; margin: 12px 0 0 0;">
              Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para continuar con el proceso:
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding: 10px 32px 24px 32px; text-align: center;">
            <a href="${resetUrl}" style="background-color: #00ffc3; color: #020617; display: inline-block; padding: 12px 32px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none; transition: background-color 0.2s;">
              Restablecer Contraseña
            </a>
            <p style="font-size: 12px; color: #64748b; margin-top: 16px;">
              Este enlace expira en <strong>15 minutos</strong>.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding: 0 32px;">
            <div style="border-top: 1px solid #1e293b;"></div>
          </td>
        </tr>

        <tr>
          <td style="padding: 16px 32px 8px 32px;">
            <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.5;">
              Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
            </p>
            <p style="font-size: 11px; margin-top: 8px; word-break: break-all;">
              <a href="${resetUrl}" style="color: #00ffc3; text-decoration: none; opacity: 0.8;">${resetUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; text-align: center; color: #475569; font-size: 12px;">
            &copy; ${currentYear} Techno POS. Todos los derechos reservados.
          </td>
        </tr>
      </table>
    </div>
  `;

  try {
    await resend.emails.send({
      from: `Techno POS <${emailFrom}>`,
      to,
      subject: 'Restablece tu contraseña - Techno POS',
      html: htmlContent
    });
  } catch (error) {
    console.error('Error enviando email:', error);
    throw error;
  }
};

module.exports = { sendResetEmail };