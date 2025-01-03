import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

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

  // Campos del dispositivo Tuya
  const device_id = validateField(formData.get("device_id"));
  const device_name = validateField(formData.get("device_name"));

  if (!device_id || !device_name) {
    return new Response(JSON.stringify({ success: false, error: "Faltan campos requeridos." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Inserción o actualización en Supabase
  const { data: registeredDevice, error } = await supabase
    .from("tuya_devices")
    .upsert(
      {
        user_id: user.id,
        device_id,
        device_name,
        registered_at: new Date().toISOString(),
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

  // Devuelve el dispositivo registrado como JSON
  return new Response(JSON.stringify({ success: true, device: registeredDevice }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};