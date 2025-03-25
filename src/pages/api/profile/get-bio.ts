import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificación de tokens
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No autorizado (sin tokens)." 
        }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Configuración de sesión
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: sessionError?.message || "No autorizado (tokens inválidos)." 
        }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = sessionData.user;

    // Obtener la biografía del usuario
    const { data, error } = await supabase
      .from('profiles')
      .select('prompt_profile')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error("Error obteniendo biografía:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Error al obtener la biografía",
          details: error.message
        }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        bio: data?.prompt_profile || null
      }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error inesperado:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error)
      }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}; 