import nodemailer from 'nodemailer';

// Configuración del transportador de correo
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: import.meta.env.EMAIL_USER,
    pass: import.meta.env.EMAIL_PASSWORD
  }
});

// Función helper para manejar errores de envío de correo
export const handleEmailError = (error: any) => {
  console.error("Error al enviar el correo:", error);
}; 