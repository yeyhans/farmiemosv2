import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

export const POST: APIRoute = async ({ request, cookies, params }) => {
    try {
      // 1. Validación de sesión con Supabase
      const accessToken = cookies.get("sb-access-token")?.value;
      const refreshToken = cookies.get("sb-refresh-token")?.value;
  
      if (!accessToken || !refreshToken) {
        console.error("Tokens no presentes");
        return new Response(JSON.stringify({ error: "No autorizado (no hay tokens)" }), { status: 401 });
      }
  
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        refresh_token: refreshToken,
        access_token: accessToken,
      });
  
      if (sessionError || !sessionData?.user) {
        console.error("Error de sesión o usuario no encontrado");
        return new Response(JSON.stringify({ error: "Tokens inválidos" }), { status: 401 });
      }
  
      const { data: chatSession, error: chatSessionError } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", sessionData.user.id)
        .order("created_at", { ascending: false });
  
      if (chatSessionError || !chatSession || chatSession.length === 0) {
        console.error("Error al obtener la sesión del chat o sesión no encontrada");
        return new Response(JSON.stringify({ error: "No se pudo encontrar la sesión para el usuario" }), { status: 404 });
      }
  
      let systemMessage = chatSession[0].system_message || '';
  
      // 2. Leer datos del cuerpo de la solicitud
      const formData = await request.formData();
      const userPrompt = formData.get("prompt")?.toString();
      const imageFile = formData.get("file") as File | null;
      const conversationHistory = formData.get("conversation_history")
        ? JSON.parse(formData.get("conversation_history")?.toString() || "[]")
        : [];
  
      let imageAnalysis = "";
      if (imageFile && imageFile.size > 0) {
        console.log("Procesando imagen...");
        const buffer = await imageFile.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");
  
        const response = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "user", content: "Describe el detalle de la planta que se visualiza en la imagen." },
            { role: "user", content: `data:${imageFile.type};base64,${base64Image}` },
          ],
        });
  
        console.log("Respuesta del análisis de imagen:", response);
        imageAnalysis = response.choices[0]?.message?.content || "No se pudo analizar la imagen.";
      }
  
      conversationHistory.push({ role: "user", content: userPrompt });
      conversationHistory.push({ role: "system", content: systemMessage });
      if (imageAnalysis) {
        conversationHistory.push({ role: "assistant", content: imageAnalysis });
      }
  
      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: conversationHistory,
        temperature: 0.7,
      });
  
      const aiResponse = chatCompletion.choices[0]?.message?.content || "";
      conversationHistory.push({ role: "assistant", content: aiResponse });
  
      // 3. Actualización de la sesión existente en lugar de crear una nueva
      const { data, error } = await supabase.from("chats").upsert([{
        id: chatSession[0].id, // Asegura que actualice la fila correcta
        user_id: sessionData.user.id,
        session_name: "Nombre de sesión",  // Puedes actualizar estos valores si es necesario
        session_description: "Descripción de sesión",  // Igual
        system_message: systemMessage,
        image_analysis: imageAnalysis,
        user_prompt: [...chatSession[0]?.user_prompt || [], userPrompt], // Agrega el prompt al arreglo existente
        ai_response: [...chatSession[0]?.ai_response || [], aiResponse], // Agrega la respuesta al arreglo existente
      }]);
  
      if (error) {
        console.error("Error al guardar en la base de datos:", error);
        throw new Error("Error al guardar la conversación");
      }
  
      return new Response(
        JSON.stringify({
          userPrompt,
          imageAnalysis,
          aiResponse,
          conversationHistory,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      console.error("Error en la API de chat:", error);
      return new Response(JSON.stringify({ error: "Error interno", details: error.message }), {
        status: 500,
      });
    }
};
