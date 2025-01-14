import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const sessionId = formData.get("sessionId")?.toString();
    const index = parseInt(formData.get("index")?.toString() || "");
    const isLiked = formData.get("isLiked") === "true";

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

    // Obtener la conversación
    const { data: chatSession } = await supabase
      .from("chats")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", sessionData.user.id)
      .single();

    if (!chatSession) {
      throw new Error("Chat no encontrado");
    }

    // Upsert del feedback (actualizar si existe, insertar si no)
    const { error: upsertError } = await supabase
      .from("feedback")
      .upsert({
        user_id: sessionData.user.id,
        chat_id: sessionId,
        message_index: index,
        system_message: "Eres un experto en programacion sobre todo en framework astro, utilizando html y js nativo integrado con tailwind css",
        user_prompt: chatSession.user_prompt[index],
        ai_response: chatSession.ai_response[index],
        is_liked: isLiked ? 1 : 0,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,chat_id,message_index',
      });

    if (upsertError) {
      throw upsertError;
    }

    return new Response(
      JSON.stringify({ success: true }), 
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

