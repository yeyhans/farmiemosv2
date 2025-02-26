import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const ALL: APIRoute = async ({ request, cookies }) => {
  try {
    const method = request.method.toUpperCase();

    // Verificar tokens de sesión
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado (sin tokens)." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado (tokens inválidos)." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const user = sessionData.user;

    if (method === "PUT") {
      const body = await request.json();
      const { id, config } = body;

      if (!id || !config) {
        return new Response(
          JSON.stringify({ success: false, error: "Datos incompletos" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("cultivos")
        .update({ 
          config,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("uuid", user.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Configuración actualizada" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Método no permitido" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error en ALL /api/cultivos/config-cultivo:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
