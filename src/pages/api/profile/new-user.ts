import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
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

    // Procesamiento del FormData
    const formData = await request.formData();
    const validateField = (field: FormDataEntryValue | null): string | null =>
      field?.toString().trim() || null;

    const profileData = {
      user_id: user.id,
      user_name: validateField(formData.get("user_name")),

      instagram: validateField(formData.get("instagram")),
      referee: validateField(formData.get("referee")),
      term_condition: validateField(formData.get("term_condition")),
      updated_at: new Date().toISOString(),
    };

    // Primero, intentamos verificar si existe un perfil
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select()
      .eq('user_id', user.id)
      .single();

    let result;
    
    if (existingProfile) {
      // Si existe, actualizamos
      result = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single();
    } else {
      // Si no existe, insertamos
      result = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();
    }

    const { data: updatedProfile, error: operationError } = result;

    if (operationError) {
      console.error("Error en la operación:", operationError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: operationError.message,
          details: operationError.details 
        }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }



    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: updatedProfile 
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