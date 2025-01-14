import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const sessionId = formData.get("sessionId")?.toString();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "ID de sesión no proporcionado" }), 
        { status: 400 }
      );
    }

    // Validar tokens
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }), 
        { status: 401 }
      );
    }

    // Validar sesión
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(
        JSON.stringify({ error: "Sesión inválida" }), 
        { status: 401 }
      );
    }

    // Obtener todos los feedbacks para esta sesión
    const { data: feedbacks, error: feedbackError } = await supabase
      .from("feedback")
      .select("message_index, is_liked")
      .eq("chat_id", sessionId)
      .eq("user_id", sessionData.user.id);

    if (feedbackError) {
      throw feedbackError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        feedbacks: feedbacks || [] 
      }), 
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error en el procesamiento:", error);
    return new Response(
      JSON.stringify({
        error: "Error del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      }),
      { status: 500 }
    );
  }
};