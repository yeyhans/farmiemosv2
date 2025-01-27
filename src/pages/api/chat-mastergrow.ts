import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Validación de sesión con Supabase
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "No autorizado (no hay tokens)" }), { status: 401 });
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(JSON.stringify({ error: "Tokens inválidos" }), { status: 401 });
    }

    // 2. Obtener perfil del usuario
    const user = sessionData.user;
    const { data, error } = await supabase.from("chats").select("*");
    console.log("Data obtenida:", data, "Error:", error);


    // 3. Obtener la conversación existente de Supabase
    const { data: chatSession, error: chatSessionError } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", sessionData.user.id)

      console.log('chatSession:', chatSession);

    if (chatSessionError || !chatSession) {
      return new Response(JSON.stringify({ error: "No se pudo obtener la sesión" }), {
        status: 500,
      });
    }

    const systemMessage = chatSession.system_message || "Mensaje de sistema no disponible"; // Obtén el mensaje del sistema
    let conversationHistory = chatSession.user_prompt.map((prompt: string) => ({
      role: "user",
      content: prompt,
    }));

    // 4. Leer la información del request (incluyendo archivos si existen)
    const formData = await request.formData();
    const userPrompt = formData.get("prompt")?.toString() || "";
    const imageFile = formData.get("file") as File | null;

    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "No se recibió un prompt válido" }), {
        status: 400,
      });
    }

    // 5. (Opcional) Procesar la imagen si existe
    let imageAnalysis = "";
    if (imageFile && imageFile.size > 0) {
      const buffer = await imageFile.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString("base64");

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "user", content: "Describe el detalle de la planta que se visualiza en la imagen." },
          {
            role: "user",
            content: `data:${imageFile.type};base64,${base64Image}`,
          },
        ],
      });

      imageAnalysis =
        response.choices[0]?.message?.content ||
        "No se pudo obtener una respuesta para la imagen.";
    }

    // 6. Agregar el prompt del usuario y la respuesta del modelo al historial de la conversación
    conversationHistory.push({ role: "system", content: systemMessage });
    conversationHistory.push({ role: "user", content: userPrompt });

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversationHistory,
      temperature: 0.7,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "";
    conversationHistory.push({ role: "assistant", content: aiResponse });

    // 7. Actualizar o insertar en Supabase
    const updatedConversation = {
      user_prompt: conversationHistory.filter(msg => msg.role === "user").map(msg => msg.content),
      ai_response: conversationHistory.filter(msg => msg.role === "assistant").map(msg => msg.content),
      image_analysis: imageAnalysis,
      updated_at: new Date().toISOString(),
    };

    // Actualizamos la conversación en lugar de insertar una nueva
    const { data: updateData, error: updateError } = await supabase
      .from("chats")
      .upsert([ // upsert actualizará si existe, o insertará si no
        {
          user_id: user.id,
          ...updatedConversation,
        },
      ]);

    if (updateError) {
      console.error("Error al guardar la conversación en Supabase:", updateError);
      return new Response(JSON.stringify({ error: "Error al guardar la conversación" }), {
        status: 500,
      });
    }

    // 8. Devolver la respuesta al frontend
    return new Response(
      JSON.stringify({
        userPrompt,
        imageAnalysis,
        aiResponse,
        conversationHistory,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error en /api/chat-mastergrow.ts:", error);
    return new Response(JSON.stringify({ error: "Error interno", details: error.message }), {
      status: 500,
    });
  }
};
