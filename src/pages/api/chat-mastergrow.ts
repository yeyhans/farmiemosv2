// src/pages/api/mastergrow.ts
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
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "No se pudo obtener el perfil" }), {
        status: 500,
      });
    }

    // 3. Leer la información del request
    //    Usamos formData para capturar un posible archivo
    const formData = await request.formData();

    // - 'userPrompt' viene del campo "prompt"
    const userPrompt = formData.get("prompt")?.toString() || "";

    // - 'imageFile' viene del campo "file" (opcional)
    const imageFile = formData.get("file") as File | null;

    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "No se recibió un prompt válido" }), {
        status: 400,
      });
    }

    // 4. Inicializar conversationHistory desde el frontend
    const conversationHistory = formData.get("conversationHistory") 
    ? JSON.parse(formData.get("conversationHistory")?.toString() || '[]')
    : [];
    

    // 4. (Opcional) Procesar la imagen si existe
    let imageAnalysis = "";
    if (imageFile && imageFile.size > 0) {
      // Convertir a Base64
      const buffer = await imageFile.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString("base64");

      // En este ejemplo, simplemente llamamos a GPT con un "mensaje" que describe lo que ves
      // *Puedes* adaptar la lógica para usar otros endpoints de OpenAI, como Vision (cuando esté disponible).
      // Por ahora simulamos un "análisis simple" llamando a chat.completions con un prompt que describe la imagen
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

      imageAnalysis =
        response.choices[0]?.message?.content ||
        "No se pudo obtener una respuesta para la imagen.";
    }

    // 5. Construir el mensaje final con la info del perfil y el resultado de la imagen (si existe)
    const systemMessage = `
      El usuario se llama: ${profile.user_name}.
      Nivel de experiencia: ${profile.experience_level}.
      Comuna: ${profile.comuna}.
      Cultivo principal: ${profile.cultivo_principal}.
      Escala de cultivo: ${profile.escala_cultivo}.
      Motivación: ${profile.motivacion}.
      Tamaño espacio: ${profile.tamano_espacio}.
      Tipo suelo: ${profile.tipo_suelo}.
      Tipo iluminación: ${profile.tipo_iluminacion}.
      Fuente riego: ${profile.fuente_riego}.
      Fertilización: ${profile.fertilizacion}.
      Control plagas: ${profile.control_plagas}.
      Frecuencia riego: ${profile.frecuencia_riego}.
      Problemas enfrentados: ${profile.problemas_enfrentados}.
      Objetivos mejora: ${profile.objetivos_mejora}.
      Interés tecnología: ${profile.interes_tecnologia}.

      Información de la imagen (si se subió): ${imageAnalysis}
    `;
          // Agregar el mensaje del usuario al historial
    conversationHistory.push({ role: 'user', content: userPrompt });
    conversationHistory.push({ role: 'system', content: systemMessage });

    // 6. Llamar a la API de OpenAI con el prompt final
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: conversationHistory,
      temperature: 0.7,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "";

    conversationHistory.push({ role: 'assistant', content: aiResponse });

    const saveConversation = async (
      userId: string,
      systemMessage: string,
      userPrompt: string,
      imageAnalysis: string,
      aiResponse: string,
    ) => {
      const { data, error } = await supabase
        .from("conversations")
        .insert([
          {
            user_id: userId,
            system_message: systemMessage,
            user_prompt: userPrompt,
            image_analysis: imageAnalysis,
            ai_response: aiResponse,
            created_at: new Date().toISOString(),
          },
        ]);
    
      if (error) {
        console.error("Error saving conversation:", error);
        throw new Error("Error saving conversation");
      }
    
      return data;
    };
    
    // Guarda la conversación en Supabase
    try {
      await saveConversation(
        user.id,
        systemMessage,
        userPrompt,
        imageAnalysis,
        aiResponse
      );
    } catch (error) {
      console.error("Error al guardar la conversación en Supabase:", error);
    }; 

    // 7. Devolver respuesta
    return new Response(
      JSON.stringify({
        systemMessage,
        userPrompt,
        imageAnalysis,
        aiResponse,
        conversationHistory
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

    

  } catch (error: any) {
    console.error("Error en /api/chat-with-upload.ts:", error);
    return new Response(JSON.stringify({ error: "Error interno", details: error.message }), {
      status: 500,
    });
  }
};
