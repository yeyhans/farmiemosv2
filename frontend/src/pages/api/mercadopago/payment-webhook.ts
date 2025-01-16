import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (body.action === "payment.created") {
      const paymentId = body.data.id;

      const payment = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }).then((res) => res.json());

      if (payment.status === "approved") {
        const userId = payment.metadata.user_id;

        const { error } = await supabase
          .from("profiles")
          .update({ subscription_status: "suscribed" })
          .eq("user_id", userId);

        if (error) {
          console.error("Error al actualizar estado:", error);
          throw error;
        }
      }
    }

    return new Response("Webhook recibido", { status: 200 });
  } catch (error) {
    console.error("Error en el webhook:", error);
    return new Response("Error procesando webhook", { status: 500 });
  }
};
