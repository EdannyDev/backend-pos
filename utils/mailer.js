require('dotenv').config();
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

const {
  GMAIL_USER,
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_REDIRECT_URI
} = process.env;

const oAuth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REDIRECT_URI
);

async function getTransporter() {
  try {
    oAuth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

    const tokenResponse = await oAuth2Client.getAccessToken();
    const accessToken = tokenResponse?.token;

    if (!accessToken) {
      throw new Error('No se pudo obtener el token de acceso.');
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: GMAIL_USER,
        clientId: GMAIL_CLIENT_ID,
        clientSecret: GMAIL_CLIENT_SECRET,
        refreshToken: GMAIL_REFRESH_TOKEN,
        accessToken
      }
    });
  } catch (error) {
    throw error;
  }
}

async function sendRecoveryEmail({ to, name, tempPassword }) {
  try {
    const transporter = await getTransporter();

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #0B5394;">Generación de Contraseña</h2>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
        <p>Tu nueva <strong>contraseña temporal</strong> es:</p>
        <p style="font-size: 20px; font-weight: bold; color: #D9534F;">${tempPassword}</p>
        <p>Esta contraseña expirará en <strong>5 minutos</strong>.</p>
        <p>Por favor, inicia sesión con esta contraseña y cámbiala de inmediato en tu perfil.</p>
        <hr />
        <p style="font-size: 13px; color: #777;">Este mensaje fue generado automáticamente, por favor no respondas.</p>
      </div>
    `;

    const mailOptions = {
      from: `Techno Support <${GMAIL_USER}>`,
      to,
      subject: 'Tu contraseña temporal de acceso',
      html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Correo enviado con éxito:', result);
    return result;
  } catch (err) {
    console.error('Error al enviar correo:', err);
    throw new Error('Error al enviar correo de recuperación: ' + err.message);
  }
}

module.exports = {
  sendRecoveryEmail
};