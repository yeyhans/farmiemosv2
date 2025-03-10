import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import nodemailer from 'nodemailer';
import { supabase } from '../../../lib/supabase';

const client = new MercadoPagoConfig({ 
  accessToken: import.meta.env.MERCADOPAGO_ACCESS_TOKEN 
});

const payment = new Payment(client);

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: import.meta.env.EMAIL_USER,
    pass: import.meta.env.EMAIL_PASSWORD
  }
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const requestData = await request.json();
    const { eventData } = requestData;
    
    // Enhanced debugging to see what's being received
    console.log('Received payment request with data:', JSON.stringify(requestData, null, 2));
    console.log('Event data:', JSON.stringify(eventData, null, 2));
    
    // Validate required fields
    if (!requestData.token) {
      console.error('Missing payment token in request');
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Falta el token de pago. Verifica que los campos de tarjeta estén correctamente configurados.'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Create payment in MercadoPago with more detailed error handling
    let paymentData;
    try {
      paymentData = await payment.create({
        body: {
          transaction_amount: requestData.transaction_amount,
          token: requestData.token,
          description: `Evento de Catación - ${eventData?.eventDay || '22'} de Marzo`,
          installments: requestData.installments,
          payment_method_id: requestData.payment_method_id,
          payer: {
            email: requestData.payer.email
          },
          metadata: {
            eventDay: eventData?.eventDay || '22',
            quantity: eventData?.quantity || 1,
            attendees: eventData?.attendees || []
          }
        }
      });
      
      console.log('MercadoPago payment response:', JSON.stringify(paymentData, null, 2));
    } catch (mpError) {
      console.error('MercadoPago payment creation error:', mpError);
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Error al procesar el pago con MercadoPago',
          details: mpError instanceof Error ? mpError.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Check payment status - accept both approved and in_process
    if (paymentData.status === 'approved' || paymentData.status === 'in_process') {
      // Guardar información del pago en la tabla "paymentdata"
      const { error: paymentError } = await supabase
        .from('paymentdata')
        .insert({
          payment_id: paymentData.id,
          transaction_amount: requestData.transaction_amount,
          payment_method_id: requestData.payment_method_id,
          installments: requestData.installments,
          status: paymentData.status,
          description: `Evento de Catación - ${eventData?.eventDay || '22'} de Marzo`,
          payer_email: requestData.payer.email,
          event_day: eventData?.eventDay || '22',
          quantity: eventData?.quantity || 1,
          created_at: new Date().toISOString()
        });
      
      if (paymentError) {
        console.error('Error guardando datos de pago en Supabase:', paymentError);
      }
      
      // Guardar información de asistentes en la tabla "asistentes_evento"
      if (eventData && eventData.attendees && Array.isArray(eventData.attendees) && eventData.attendees.length > 0) {
        const attendeesData = eventData.attendees.map((attendee: any) => ({
          payment_id: paymentData.id,
          name: attendee.name || 'No especificado',
          phone: attendee.phone || 'No especificado',
          instagram: attendee.instagram || null,
          event_day: eventData?.eventDay || '22',
          created_at: new Date().toISOString()
        }));
        
        const { error: attendeesError } = await supabase
          .from('asistentes_evento')
          .insert(attendeesData);
        
        if (attendeesError) {
          console.error('Error guardando datos de asistentes en Supabase:', attendeesError);
        }
      }

      // Format attendees for email
      let attendeesHtml = '';
      if (eventData && eventData.attendees && Array.isArray(eventData.attendees) && eventData.attendees.length > 0) {
        attendeesHtml = `
          <h2>Datos de asistentes:</h2>
          <ul>
        `;
        
        eventData.attendees.forEach((attendee: any, index: number) => {
          attendeesHtml += `
            <li>
              <strong>Asistente ${index + 1}:</strong><br>
              Nombre: ${attendee.name || 'No especificado'}<br>
              Teléfono: ${attendee.phone || 'No especificado'}<br>
              ${attendee.instagram ? `Instagram: @${attendee.instagram}` : ''}
            </li>
          `;
        });
        
        attendeesHtml += '</ul>';
      } else {
        console.log('No attendee information available:', eventData);
        attendeesHtml = '<p>No se recibió información de asistentes.</p>';
      }

      // Customize email message based on payment status
      const statusMessage = paymentData.status === 'approved' 
        ? 'Confirmado' 
        : 'En proceso de confirmación';
      
      const additionalInfo = paymentData.status === 'in_process'
        ? '<p><strong>Nota:</strong> Tu pago está siendo procesado. Una vez aprobado, recibirás un correo de confirmación.</p>'
        : '';

      // Send confirmation email to customer
      await transporter.sendMail({
        from: import.meta.env.EMAIL_USER,
        to: [requestData.payer.email],
        subject: 'Confirmación de Reserva - Evento de Catación',
        html: `
          <h1>¡Gracias por tu reserva!</h1>
          <p>Has reservado para ${eventData?.description || 'Catación'} del ${eventData?.eventDay || '22'} de Marzo.</p>
          <p>Detalles de la transacción:</p>
          <ul>
            <li>ID de Pago: ${paymentData.id}</li>
            <li>Monto: $${requestData.transaction_amount.toLocaleString()}</li>
            <li>Cantidad de entradas: ${eventData?.quantity || 1}</li>
            <li>Estado: ${statusMessage}</li>
          </ul>
          ${additionalInfo}
          ${attendeesHtml}
          <p>Te enviaremos instrucciones sobre la ubicación exacta del evento por WhatsApp un día antes.</p>
          <p><a href="https://chat.whatsapp.com/C45HeFUYUJWFlEWumbWoPJ">Ingresa a nuestro grupo de Whatsapp</a></p>
          <p>¡Nos vemos pronto!</p>
        `
      });

      // Send notification email to admin
      await transporter.sendMail({
        from: import.meta.env.EMAIL_USER,
        to: ['yeysonhans@gmail.com'],
        subject: 'Nueva reserva para Evento de Catación',
        html: `
          <h1>Se ha realizado una nueva reserva para el evento</h1>
          <p>Detalles de la transacción:</p>
          <ul>
            <li>ID de Pago: ${paymentData.id}</li>
            <li>Monto: $${requestData.transaction_amount.toLocaleString()}</li>
            <li>Método de Pago: ${requestData.payment_method_id}</li>
            <li>Cuotas: ${requestData.installments}</li>
            <li>Estado: ${paymentData.status}</li>
            <li>Fecha: ${new Date().toLocaleString()}</li>
            <li>Descripción: Evento de Catación - ${eventData?.eventDay || '22'} de Marzo</li>
            <li>Cantidad de entradas: ${eventData?.quantity || 1}</li>
          </ul>
          <h2>Datos del cliente:</h2>
          <ul>
            <li>Email: ${requestData.payer.email}</li>
          </ul>
          ${attendeesHtml}
        `
      });

      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Pago procesado exitosamente',
          data: {
            id: paymentData.id,
            status: paymentData.status,
            email: requestData.payer.email,
            eventDetails: {
              day: eventData?.eventDay || '22',
              quantity: eventData?.quantity || 1
            }
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