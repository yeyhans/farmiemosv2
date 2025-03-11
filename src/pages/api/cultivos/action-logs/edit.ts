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
    const { cultivoId, actions_logs } = body;

    if (!cultivoId || !actions_logs) {
      return new Response(
        JSON.stringify({ success: false, error: "Datos incompletos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Actualizar en Supabase
    const { error: updateError } = await supabase
      .from("cultivos")
      .update({
        actions_logs: actions_logs,
        updated_at: new Date().toISOString()
      })
      .eq("id", cultivoId)
      .eq("uuid", userId);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: "Error al actualizar los registros de acciones" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Acción actualizada correctamente" 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error al actualizar registro de acción:", error);
    
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