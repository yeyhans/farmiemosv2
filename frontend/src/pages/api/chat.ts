// src/pages/api/chat.ts
import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

// 1. Importa la librería OpenAI v4
import OpenAI from "openai";

// 2. Instancia el cliente de OpenAI
//    Recuerda setear tu API Key como variable de entorno
const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY, 
  // O si estás en Node, process.env.OPENAI_API_KEY
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Validar sesión en Supabase
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;
    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "No autorizado (sin tokens)" }), {
        status: 401,
      });
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(JSON.stringify({ error: "No autorizado (tokens inválidos)" }), {
        status: 401,
      });
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
    console.log("Perfil del usuario:", profile);

    // 3. Leer el 'prompt' del body
    const body = await request.json();
    const userPrompt = body?.prompt?.toString() ?? "";
    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "No se recibió un prompt válido" }), {
        status: 400,
      });
    }

    // 4. Construir un mensaje con la info del perfil
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

    // 5. Llamar a la API de OpenAI con la nueva librería
    //    Ejemplo usando el endpoint "chat.completions.create"
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // O "gpt-4" / "gpt-4o" según tu necesidad
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
      // Opcional: controla la temperatura
      temperature: 0.7,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "";

    // 6. Devolver respuesta
    return new Response(
      JSON.stringify({ 
        systemMessage,
        userPrompt,
        aiResponse 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (err: any) {
    console.error("Error en /api/chat.ts:", err);
    return new Response(JSON.stringify({ error: "Error interno", details: err.message }), {
      status: 500,
    });
  }
};
