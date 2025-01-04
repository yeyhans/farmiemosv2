// src/pages/api/mastergrow-tutor.ts
import type { APIRoute } from "astro";
import { createClient } from '@supabase/supabase-js';
import OpenAI from "openai";

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

// ID del asistente preconfigurado (créalo una vez y guarda el ID)
const ASSISTANT_ID = "asst_AmGn87wqI4nuMSW1qtkwVdk1"; // Reemplaza con tu ID real

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { userMessage, threadId } = await request.json();
    
    // Verificar autenticación
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: "No hay sesión activa" }), 
        { status: 401 }
      );
    }

    // Configurar la sesión de Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Sesión inválida" }), 
        { status: 401 }
      );
    }

    // Obtener o crear un thread
    let thread;
    if (threadId) {
      thread = await openai.beta.threads.retrieve(threadId);
    } else {
      thread = await openai.beta.threads.create();
    }

    // Agregar el mensaje del usuario al thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage
    });

    // Ejecutar el asistente
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
      instructions: "Por favor, proporciona consejos prácticos y específicos sobre el cultivo de plantas."
    });

    // Esperar y verificar el estado del run
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }

    // Obtener los mensajes más recientes
    const messages = await openai.beta.threads.messages.list(thread.id);

    // Encontrar la respuesta del asistente
    const assistantResponse = messages.data
      .find(msg => msg.role === 'assistant' && msg.run_id === run.id);

    if (!assistantResponse) {
      throw new Error('No se encontró respuesta del asistente');
    }

    // Guardar en Supabase
    const { error: insertError } = await supabase
      .from("conversaciones")
      .insert({
        user_id: session.user.id,
        user_message: userMessage,
        assistant_response: assistantResponse.content[0].text.value,
        created_at: new Date().toISOString(),
        thread_id: thread.id // Guardar el ID del thread para futuras referencias
      });

    if (insertError) {
      console.error("Error al guardar en Supabase:", insertError);
    }

    // Devolver los mensajes y el ID del thread
    return new Response(JSON.stringify({
      messages: messages.data.map(msg => ({
        role: msg.role,
        content: msg.content[0].text.value
      })),
      threadId: thread.id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error en mastergrow-tutor:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor", details: error.message }), 
      { status: 500 }
    );
  }
};