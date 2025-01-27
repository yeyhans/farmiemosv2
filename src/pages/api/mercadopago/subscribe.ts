import type { APIRoute } from "astro";
import { mercadopago } from "../../../lib/mercadopago";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: userData, error } = await supabase.auth.getUser(accessToken);

    if (error || !userData) {
      return new Response(
        JSON.stringify({ success: false, error: "Usuario no encontrado." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    
    // Configurar preferencia de pago
    const preference = {
      items: [
        {
          title: "Suscripción Premium",
          description: "Acceso a funcionalidades avanzadas",
          quantity: 1,
          currency_id: "MXN", // Cambia la moneda según tu país
          unit_price: 99.0, // Precio de la suscripción
        },
      ],
      payer: {
        email: user.email,
      },
      notification_url: `${request.url.origin}/api/payment-webhook`, // Webhook de notificación de pago
      back_urls: {
        success: `${request.url.origin}/success`,
        failure: `${request.url.origin}/failure`,
      },
      auto_return: "approved",
    };

    const response = await mercadopago.create({ body: preference });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        init_point: response.body.init_point, // Enlace para redirigir al usuario
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error al crear preferencia de pago:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Error interno." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
