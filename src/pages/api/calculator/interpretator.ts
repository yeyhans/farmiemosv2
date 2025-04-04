// src/pages/api/mastergrow.ts
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
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


    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "No se recibió un prompt válido" }), {
        status: 400,
      });
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


      Ahora, el usuario pregunta: "${userPrompt}"
    `;

    // 6. Llamar a la API de OpenAI con el prompt final
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "";

    const saveConversation = async (
      userId: string,
      systemMessage: string,
      userPrompt: string,
      aiResponse: string
    ) => {
      const { data, error } = await supabase
        .from("interpretator-calculator")
        .insert([
          {
            user_id: userId,
            system_message: systemMessage,
            user_prompt: userPrompt,
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
        aiResponse,
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
