import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import OpenAI from "openai";

const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: import.meta.env.DEEPSEEK_API_KEY,
});

const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function searchRAG(query: string): Promise<string> {
  return "Información relevante recuperada del sistema RAG.";
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const formData = await request.formData();
  const sessionId = formData.get("sessionId")?.toString();
  const userPrompt = formData.get("prompt")?.toString();
  const imageFile = formData.get("file") as File | null;
  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (!sessionId || !userPrompt || !accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: !sessionId ? "ID de sesión no proporcionado" : !userPrompt ? "Prompt vacío" : "No autorizado" }), 
      { status: !sessionId || !userPrompt ? 400 : 401 }
    );
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ refresh_token: refreshToken, access_token: accessToken });
    if (sessionError || !sessionData?.user) {
      throw new Error("Sesión inválida");
    }

    const { data: chatSession, error: chatSessionError } = await supabase
      .from("chats")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", sessionData.user.id)
      .single();

    if (chatSessionError) throw new Error("Error al obtener el chat");

    let imageAnalysis = "";
    if (imageFile && imageFile.size > 0) {
      const buffer = await imageFile.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString("base64");

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe el detalle de la planta que se visualiza en la imagen." },
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageFile.type};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
      });

      imageAnalysis = response.choices[0]?.message?.content || "No se pudo obtener una respuesta para la imagen.";
    }

    const combinedPrompt = userPrompt + (imageAnalysis ? `\n\nAnálisis de la imagen:\n${imageAnalysis}` : "");

    const ragResponse = await searchRAG(combinedPrompt);

    const conversationHistory: ChatMessage[] = [
      { role: "system", content: "Eres un experto en cultivar todo tipo de plantas" },
      ...(chatSession.user_prompt || []).flatMap((prompt, i) => [
        { role: "user", content: prompt },
        { role: "assistant", content: chatSession.ai_response[i] }
      ]),
      { role: "user", content: combinedPrompt },
      { role: "system", content: `Información relevante: ${ragResponse}` }
    ];

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: conversationHistory,
      temperature: 1.3,
      max_tokens: 100,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    const tokensUsed = completion.usage?.total_tokens || 0;
    console.log("Tokens usados:", tokensUsed);

    if (!aiResponse) throw new Error("No se pudo generar una respuesta");

    const updatedUserPrompts = [...(chatSession.user_prompt || []), combinedPrompt];
    const updatedAiResponses = [...(chatSession.ai_response || []), aiResponse];

    const { error: updateError } = await supabase
      .from("chats")
      .update({
        user_prompt: updatedUserPrompts,
        ai_response: updatedAiResponses,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .eq("user_id", sessionData.user.id);

    if (updateError) throw new Error("Error al guardar la conversación");

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("tokens")
      .eq("user_id", sessionData.user.id)
      .single();

    if (profileError) throw new Error("Error al obtener el perfil del usuario");

    const newTokens = (profileData?.tokens || 0) + tokensUsed;
    const { error: updateTokensError } = await supabase
      .from("profiles")
      .update({ tokens: newTokens })
      .eq("user_id", sessionData.user.id);

    if (updateTokensError) throw new Error("Error al actualizar el conteo de tokens");

    return new Response(
      JSON.stringify({
        success: true,
        response: { userPrompt: combinedPrompt, aiResponse, tokensUsed, history: { userPrompts: updatedUserPrompts, aiResponses: updatedAiResponses } }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error en el procesamiento:", error);
    return new Response(
      JSON.stringify({ error: "Error del servidor", details: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500 }
    );
  }
};