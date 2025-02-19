import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    // Verificación de tokens
    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado (sin tokens)." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Configuración de sesión en Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado (tokens inválidos)." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const user = sessionData.user;

    // Obtener los datos del cuerpo de la solicitud
    const formData = await request.formData();
    const qr_id = formData.get("qr_id");
    const qr_visible = formData.get("qr_visible");

    // Validar los datos
    if (!qr_id || !qr_visible) {
      return new Response(
        JSON.stringify({ error: "Datos incompletos" }),
        { status: 400 }
      );
    }

    // Actualizar el registro del QR en la base de datos
    const { data: qr, error: updateError } = await supabase
      .from("qr")
      .update({ qr_visible, uuid: user.id })
      .eq("id", qr_id)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Error al actualizar el QR", details: updateError }),
        { status: 500 }
      );
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({ message: "QR registrado exitosamente", qr }),
      { status: 200 }
    );
  } catch (error) {
    // Manejo de errores inesperados
    return new Response(
      JSON.stringify({ error: "Error interno del servidor", details: "Error al registrar el QR" }),
      { status: 500 }
    );
  }
};