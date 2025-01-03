import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  // Verificación de tokens
  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ success: false, error: "No autorizado (sin tokens)." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Configuración de sesión en Supabase
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    refresh_token: refreshToken,
    access_token: accessToken,
  });

  if (sessionError || !sessionData?.user) {
    return new Response(JSON.stringify({ success: false, error: "No autorizado (tokens inválidos)." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = sessionData.user;

  // Extraer datos del formulario
  const formData = await request.formData();
  const validateField = (field: FormDataEntryValue | null) =>
    field?.toString().trim() ? field.toString().trim() : null;

  // Campos del perfil
  const user_name = validateField(formData.get("user_name"));
  const experience_level = validateField(formData.get("experience_level"));
  const comuna = validateField(formData.get("comuna"));
  const cultivo_principal = validateField(formData.get("cultivo_principal"));
  const escala_cultivo = validateField(formData.get("escala_cultivo"));
  const motivacion = validateField(formData.get("motivacion"));
  const tamano_espacio = validateField(formData.get("tamano_espacio"));
  const tipo_suelo = validateField(formData.get("tipo_suelo"));
  const tipo_iluminacion = validateField(formData.get("tipo_iluminacion"));
  const fuente_riego = validateField(formData.get("fuente_riego"));
  const fertilizacion = validateField(formData.get("fertilizacion"));
  const control_plagas = validateField(formData.get("control_plagas"));
  const frecuencia_riego = validateField(formData.get("frecuencia_riego"));
  const problemas_enfrentados = validateField(formData.get("problemas_enfrentados"));
  const objetivos_mejora = validateField(formData.get("objetivos_mejora"));
  const interes_tecnologia = validateField(formData.get("interes_tecnologia"));

  // Inserción o actualización en Supabase
  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        user_name,
        experience_level,
        comuna,
        cultivo_principal,
        escala_cultivo,
        motivacion,
        tamano_espacio,
        tipo_suelo,
        tipo_iluminacion,
        fuente_riego,
        fertilizacion,
        control_plagas,
        frecuencia_riego,
        problemas_enfrentados,
        objetivos_mejora,
        interes_tecnologia,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .single();

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Devuelve el perfil actualizado como JSON
  return new Response(JSON.stringify({ success: true, profile: updatedProfile }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
