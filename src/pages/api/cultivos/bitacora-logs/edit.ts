import type { APIRoute } from "astro";
import { supabase } from "../../../../lib/supabase";

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    // Validación de sesión con Supabase
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado (sin tokens)" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Sesión inválida" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = sessionData.user.id;
    const body = await request.json();
    const { cultivoId, timestamp, newDescription } = body;

    if (!cultivoId || !timestamp || !newDescription) {
      return new Response(
        JSON.stringify({ success: false, error: "Datos incompletos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Obtener el registro actual
    const { data: cultivoData, error: cultivoError } = await supabase
      .from("cultivos")
      .select("bitacora_logs")
      .eq("id", cultivoId)
      .eq("uuid", userId)
      .single();

    if (cultivoError) {
      return new Response(
        JSON.stringify({ success: false, error: "Error al obtener datos del cultivo" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verificar que existan logs de bitácora
    if (!Array.isArray(cultivoData?.bitacora_logs)) {
      return new Response(
        JSON.stringify({ success: false, error: "No hay entradas de bitácora para este cultivo" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Encontrar y actualizar la entrada específica
    const updatedLogs = cultivoData.bitacora_logs.map(entry => {
      if (entry.timestamp === timestamp) {
        return { ...entry, descripcion: newDescription };
      }
      return entry;
    });

    // Actualizar en Supabase
    const { error: updateError } = await supabase
      .from("cultivos")
      .update({
        bitacora_logs: updatedLogs,
        updated_at: new Date().toISOString()
      })
      .eq("id", cultivoId)
      .eq("uuid", userId);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: "Error al actualizar la bitácora" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Descripción actualizada correctamente" 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error al editar entrada de bitácora:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Error al procesar la solicitud",
        details: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}; 