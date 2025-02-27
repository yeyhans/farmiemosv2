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
      const { cultivoId, ambiente } = body;

      if (!cultivoId || !ambiente) {
        return new Response(
          JSON.stringify({ success: false, error: "Datos incompletos" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Primero obtenemos el registro actual para verificar si ya existe ambiente
      const { data: currentData, error: fetchError } = await supabase
        .from("cultivos")
        .select("ambiente")
        .eq("id", cultivoId)
        .eq("uuid", user.id)
        .single();

      if (fetchError) {
        return new Response(
          JSON.stringify({ success: false, error: fetchError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Actualizamos el campo ambiente
      const { error: updateError } = await supabase
        .from("cultivos")
        .update({ 
          ambiente: ambiente,
          updated_at: new Date().toISOString()
        })
        .eq("id", cultivoId)
        .eq("uuid", user.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Ambiente actualizado correctamente",
          data: ambiente
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // GET para obtener el ambiente de un cultivo específico
    if (method === "GET") {
      const cultivoId = new URL(request.url).searchParams.get("cultivoId");

      if (!cultivoId) {
        return new Response(
          JSON.stringify({ success: false, error: "ID de cultivo no proporcionado" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("cultivos")
        .select("ambiente")
        .eq("id", cultivoId)
        .eq("uuid", user.id)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: data.ambiente }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Método no permitido" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error en ALL /api/cultivos/config-ambiente:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
