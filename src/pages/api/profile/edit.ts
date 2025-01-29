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
      experience_level: validateField(formData.get("experience_level")),
      comuna: validateField(formData.get("comuna")),
      cultivo_principal: validateField(formData.get("cultivo_principal")),
      escala_cultivo: validateField(formData.get("escala_cultivo")),
      motivacion: validateField(formData.get("motivacion")),
      tamano_espacio: validateField(formData.get("tamano_espacio")),
      tipo_suelo: validateField(formData.get("tipo_suelo")),
      tipo_iluminacion: validateField(formData.get("tipo_iluminacion")),
      fuente_riego: validateField(formData.get("fuente_riego")),
      fertilizacion: validateField(formData.get("fertilizacion")),
      control_plagas: validateField(formData.get("control_plagas")),
      frecuencia_riego: validateField(formData.get("frecuencia_riego")),
      problemas_enfrentados: validateField(formData.get("problemas_enfrentados")),
      objetivos_mejora: validateField(formData.get("objetivos_mejora")),
      interes_tecnologia: validateField(formData.get("interes_tecnologia")),
      desc_obj: validateField(formData.get("desc_obj")),
      desc_condiciones: validateField(formData.get("desc_condiciones")),
      desc_practicas: validateField(formData.get("desc_practicas")),
      desc_interes: validateField(formData.get("desc_interes")),
      instagram: validateField(formData.get("instagram")),
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