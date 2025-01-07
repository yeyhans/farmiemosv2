import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Obtener datos del formulario primero
    const formData = await request.formData();
    const sessionId = formData.get("sessionId")?.toString();
    const userPrompt = formData.get("prompt")?.toString();

    // 2. Validar datos del formulario
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "ID de sesión no proporcionado" }), 
        { status: 400 }
      );
    }

    if (!userPrompt) {
      return new Response(
        JSON.stringify({ error: "Prompt vacío" }), 
        { status: 400 }
      );
    }

    // 3. Validación de tokens
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }), 
        { status: 401 }
      );
    }

    // 4. Validación de sesión
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

    // 5. Obtener chat específico por ID
    const { data: chatSession, error: chatSessionError } = await supabase
      .from("chats")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", sessionData.user.id)
      .single();

    if (chatSessionError) {
      console.error("Error al obtener chat:", chatSessionError);
      return new Response(
        JSON.stringify({ error: "Error al obtener el chat" }), 
        { status: 500 }
      );
    }

    // 6. Preparar el historial de conversación
    const previousUserPrompts = chatSession?.user_prompt || [];
    const previousAiResponses = chatSession?.ai_response || [];
    
    const conversationHistory: ChatMessage[] = [];

    // Mensaje del sistema
    const systemMessage = `Eres un asistente especializado en agricultura y cultivos. 
    Por favor, proporciona respuestas específicas y prácticas basadas en conocimientos agrícolas.
    ${chatSession?.system_message || ''}`;
    
    conversationHistory.push({ role: "system", content: systemMessage });

    // Agregar mensajes previos
    for (let i = 0; i < previousUserPrompts.length; i++) {
      if (previousUserPrompts[i]) {
        conversationHistory.push({ role: "user", content: previousUserPrompts[i] });
      }
      if (previousAiResponses[i]) {
        conversationHistory.push({ role: "assistant", content: previousAiResponses[i] });
      }
    }

    // Agregar el nuevo prompt
    conversationHistory.push({ role: "user", content: userPrompt });

    // 7. Llamada a OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No se pudo generar una respuesta");
    }

    // 8. Actualizar la base de datos
    const updatedUserPrompts = [...previousUserPrompts, userPrompt];
    const updatedAiResponses = [...previousAiResponses, aiResponse];

    const { error: updateError } = await supabase
      .from("chats")
      .update({
        user_prompt: updatedUserPrompts,
        ai_response: updatedAiResponses,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .eq("user_id", sessionData.user.id);

    if (updateError) {
      console.error("Error al actualizar chat:", updateError);
      throw new Error("Error al guardar la conversación");
    }

    // 9. Enviar respuesta
    return new Response(
      JSON.stringify({
        success: true,
        response: {
          userPrompt,
          aiResponse,
          history: {
            userPrompts: updatedUserPrompts,
            aiResponses: updatedAiResponses
          }
        }
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