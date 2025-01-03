// src/pages/api/profile.ts
import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    return new Response("No autorizado (sin tokens).", { status: 401 });
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    refresh_token: refreshToken,
    access_token: accessToken,
  });

  if (sessionError || !sessionData?.user) {
    return new Response("No autorizado (tokens inválidos).", { status: 401 });
  }

  const user = sessionData.user;

  const formData = await request.formData();

  // Extraemos los campos del formulario
  const user_name = formData.get("user_name")?.toString() ?? "";
  const experience_level = formData.get("experience_level")?.toString() ?? "";
  const comuna = formData.get("comuna")?.toString() ?? "";
  const cultivo_principal = formData.get("cultivo_principal")?.toString() ?? "";
  const escala_cultivo = formData.get("escala_cultivo")?.toString() ?? "";
  const motivacion = formData.get("motivacion")?.toString() ?? "";
  const tamano_espacio = formData.get("tamano_espacio")?.toString() ?? "";
  const tipo_suelo = formData.get("tipo_suelo")?.toString() ?? "";
  const tipo_iluminacion = formData.get("tipo_iluminacion")?.toString() ?? "";
  const fuente_riego = formData.get("fuente_riego")?.toString() ?? "";
  const fertilizacion = formData.get("fertilizacion")?.toString() ?? "";
  const control_plagas = formData.get("control_plagas")?.toString() ?? "";
  const frecuencia_riego = formData.get("frecuencia_riego")?.toString() ?? "";
  const problemas_enfrentados = formData.get("problemas_enfrentados")?.toString() ?? "";
  const objetivos_mejora = formData.get("objetivos_mejora")?.toString() ?? "";
  const interes_tecnologia = formData.get("interes_tecnologia")?.toString() ?? "";

  // Usamos upsert para crear o actualizar
  const { error } = await supabase
    .from("profiles")
    .upsert({
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
    })
    .single();

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return redirect("/profile");
};
