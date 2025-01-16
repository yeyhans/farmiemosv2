import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Validación de sesión con Supabase
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(JSON.stringify({ error: "Tokens inválidos" }), { status: 401 });
    }

    const formData = await request.formData();
    const imageFile = formData.get("file") as File;

    if (!imageFile) {
      return new Response(JSON.stringify({ error: "No se recibió ninguna imagen" }), { status: 400 });
    }

    const buffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe el tipo de planta, colores y posibles enfermedades en esta imagen." },
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

    const analysisResult = response.choices[0]?.message?.content || "No se pudo obtener una respuesta precisa.";

    return new Response(
      JSON.stringify({ analysisResult }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error al analizar la imagen:", error);
    return new Response(JSON.stringify({ error: "Error interno", details: error.message }), {
      status: 500,
    });
  }
};
