import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { Resend } from 'resend';

const client = new MercadoPagoConfig({ 
  accessToken: import.meta.env.MERCADOPAGO_ACCESS_TOKEN 
});

const payment = new Payment(client);

const resend = new Resend(import.meta.env.RESEND_API_KEY);

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
      // Enviar correo de confirmación
      const {data , error} = await resend.emails.send({
        from: 'Farmienda <farmiemoscl@gmail.com>',
        to: cardFormData.payer.email,
        replyTo: 'yeysonhans@gmail.com',
        subject: 'Confirmación de Pago - Farmienda',
        html: `
          <h1>¡Gracias por tu compra!</h1>
          <p>Tu pago ha sido procesado exitosamente.</p>
          <h2>Detalles de la transacción:</h2>
          <ul>
            <li>ID de pago: ${paymentData.id}</li>
            <li>Monto: $${cardFormData.transaction_amount.toLocaleString('es-CL')}</li>
            <li>Cuotas: ${cardFormData.installments}</li>
            <li>Método de pago: ${cardFormData.payment_method_id}</li>
            <li>Producto: Enmienda Agrícola Premium</li>
            <li>Estado: ${paymentData.status}</li>
          </ul>
          <p>Pronto nos pondremos en contacto contigo para coordinar la entrega.</p>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <p>Saludos,<br>Equipo Farmienda</p>
        `
      });

      if (error) {
        console.error('Error enviando el correo de confirmación:', error);
      }

      console.log('Correo enviado con éxito', data);

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
