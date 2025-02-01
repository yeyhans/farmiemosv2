import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import OpenAI from "openai";
import sharp from 'sharp';

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
      JSON.stringify({ 
        error: !sessionId ? "ID de sesión no proporcionado" : !userPrompt ? "Prompt vacío" : "No autorizado" 
      }), 
      { status: !sessionId || !userPrompt ? 400 : 401 }
    );
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({ 
      refresh_token: refreshToken, 
      access_token: accessToken 
    });

    if (sessionError || !sessionData?.user) {
      throw new Error("Sesión inválida");
    }

// Obtener el perfil del usuario desde Supabase
const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("prompt_profile")
  .eq("user_id", sessionData.user.id)
  .single();

if (profileError) {
  throw new Error("Error al obtener el perfil del usuario");
}

const profilePrompt = profileData?.prompt_profile || "";


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

      // Redimensionar la imagen a un máximo de 800x800 píxeles
const resizedImageBuffer = await sharp(Buffer.from(await imageFile.arrayBuffer()))
.resize(800, 800, { fit: 'inside' })
.toBuffer();

const base64Image = resizedImageBuffer.toString('base64');

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
    } else {
      throw new Error ("No se proporciono un archivo valido");
    }
    

    const isFirstPrompt = !chatSession?.user_prompt || chatSession.user_prompt.length === 0;
    let sessionName = chatSession?.session_name;
    if (isFirstPrompt) {
      sessionName = userPrompt.substring(0, 50);
    }

    const combinedPrompt = userPrompt + (imageAnalysis ? `\n\nAnálisis de la imagen:\n${imageAnalysis}` : "");
    const ragResponse = await searchRAG(combinedPrompt);

    const conversationHistory: ChatMessage[] = [
      { role: "system", content: "Eres un experto en cultivar todo tipo de plantas. Proporciona respuestas claras y precisas basadas en el contexto proporcionado." },
      ...(chatSession.user_prompt || []).flatMap((prompt, i) => [
        { role: "user", content: prompt },
        { role: "assistant", content: chatSession.ai_response[i] }
      ]),
      { role: "user", content: combinedPrompt },
      { role: "system", content: `Información relevante: ${profilePrompt}` }
    ];

    const completionStream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    let aiResponse = "";
    let responseTokensUsed = 0;
    let promptTokensUsed = combinedPrompt.length; // Estimación simple de tokens en el prompt

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completionStream) {
            const content = chunk.choices[0]?.delta?.content || "";
            aiResponse += content;
            responseTokensUsed += content.length; // Estimación simple de tokens en la respuesta
            controller.enqueue(content);
          }
        } catch (error) {
          console.error("Error en el stream:", error);
          controller.enqueue("[ERROR]");
        } finally {
          controller.close();

          if (aiResponse.trim().length > 0) {
            try {
              const updatedUserPrompts = [...(chatSession.user_prompt || []), combinedPrompt];
              const updatedAiResponses = [...(chatSession.ai_response || []), aiResponse];

              // Actualizar tokens usados
              const totalResponseTokens = (chatSession.response_tokens_used || 0) + responseTokensUsed;
              const totalPromptTokens = (chatSession.prompt_tokens_used || 0) + promptTokensUsed;

              await supabase
                .from("chats")
                .update({
                  user_prompt: updatedUserPrompts,
                  ai_response: updatedAiResponses,
                  response_tokens_used: totalResponseTokens,
                  prompt_tokens_used: totalPromptTokens,
                  model: "gpt-4o",
                  updated_at: new Date().toISOString(),
                  session_name: sessionName
                })
                .eq("id", sessionId)
                .eq("user_id", sessionData.user.id);

            } catch (dbError) {
              console.error("Error al actualizar la base de datos:", dbError);
            }
          } else {
            console.warn("Respuesta de IA vacía, no se actualiza la base de datos.");
          }
        }
      },
      cancel() {
        console.log("Stream cancelado por el cliente");
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain" },
    });

  } catch (error) {
    console.error("Error en el endpoint:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500 }
    );
  }
};