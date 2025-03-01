import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import nodemailer from 'nodemailer';

const client = new MercadoPagoConfig({ 
  accessToken: import.meta.env.MERCADOPAGO_ACCESS_TOKEN 
});

const payment = new Payment(client);

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: import.meta.env.EMAIL_USER, // Añade estas variables en tu .env
    pass: import.meta.env.EMAIL_PASSWORD // Usa una contraseña de aplicación de Gmail
  }
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const cardFormData = await request.json();
    
    // Crear el pago en MercadoPago
    const paymentData = await payment.create({
      body: {
        transaction_amount: cardFormData.transaction_amount, // Usar el monto recibido
        token: cardFormData.token,
        description: 'Farmienda - Enmienda Agrícola Premium',
        installments: cardFormData.installments,
        payment_method_id: cardFormData.payment_method_id,
        payer: {
          email: cardFormData.payer.email
        }
      }
    });

    // Verificar el estado del pago
    if (paymentData.status === 'approved') {
      // Enviar correo electrónico al cliente
      const { data, error } = await transporter.sendMail({
        from: import.meta.env.EMAIL_USER,
        to: [cardFormData.payer.email],
        subject: 'Confirmación de Compra - Farmienda',
        html: `
          <h1>¡Gracias por tu compra!</h1>
          <p>Detalles de la transacción:</p>
          <ul>
            <li>ID de Pago: ${paymentData.id}</li>
            <li>Monto: ${cardFormData.transaction_amount}</li>
            <li>Estado: ${paymentData.status}</li>
            <li>Descripción: Farmienda - Enmienda Agrícola Premium</li>
          </ul>
        `
      });

      // Enviar correo con los detalles de la compra al administrador
      const { data: adminEmailData, error: adminEmailError } = await transporter.sendMail({
        from: import.meta.env.EMAIL_USER,
        to: ['yeysonhans@gmail.com'],
        subject: 'Nueva venta en Farmienda',
        html: `
          <h1>Se ha realizado una nueva venta</h1>
          <p>Detalles completos de la transacción:</p>
          <ul>
            <li>ID de Pago: ${paymentData.id}</li>
            <li>Monto: ${cardFormData.transaction_amount}</li>
            <li>Método de Pago: ${cardFormData.payment_method_id}</li>
            <li>Cuotas: ${cardFormData.installments}</li>
            <li>Estado: ${paymentData.status}</li>
            <li>Fecha: ${new Date().toLocaleString()}</li>
            <li>Descripción: Farmienda - Enmienda Agrícola Premium</li>
          </ul>
          <h2>Datos del cliente:</h2>
          <ul>
            <li>Email: ${cardFormData.payer.email}</li>
          </ul>
        `
      });

      if (adminEmailError) {
        console.error('Error al enviar el correo al administrador:', adminEmailError);
      } else {
        console.log('Correo al administrador enviado correctamente');
      }

      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Pago procesado exitosamente',
          data: {
            id: paymentData.id,
            status: paymentData.status,
            email: cardFormData.payer.email,

            // Puedes incluir más datos relevantes aquí
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      throw new Error(`Pago no aprobado. Estado: ${paymentData.status}`);
    }

  } catch (error) {
    console.error('Error procesando el pago:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error instanceof Error ? error.message : 'Error procesando el pago'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
