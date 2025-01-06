// src/pages/api/chat/session.ts
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";


export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Validación de sesión con Supabase
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "No autorizado (no hay tokens)" }), { status: 401 });
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(JSON.stringify({ error: "Tokens inválidos" }), { status: 401 });
    }

    // 2. Obtener perfil del usuario
    const user = sessionData.user;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "No se pudo obtener el perfil" }), {
        status: 500,
      });
    }


    console.log('profile:', profile);

    // 3. Leer la información del request
    //    Usamos formData para capturar un posible archivo
    const formData = await request.formData();

    // - 'sessionName' viene del campo "session_name"
    const sessionName = formData.get("session_name")?.toString() || "";


    // 5. Construir el mensaje final con la info del perfil y el resultado de la imagen (si existe)
    const systemMessage = `
      El usuario se llama: ${profile.user_name}.
      Nivel de experiencia: ${profile.experience_level}.
      Comuna: ${profile.comuna}.
      Cultivo principal: ${profile.cultivo_principal}.
      Escala de cultivo: ${profile.escala_cultivo}.
      Motivación: ${profile.motivacion}.
      Tamaño espacio: ${profile.tamano_espacio}.
      Tipo suelo: ${profile.tipo_suelo}.
      Tipo iluminación: ${profile.tipo_iluminacion}.
      Fuente riego: ${profile.fuente_riego}.
      Fertilización: ${profile.fertilizacion}.
      Control plagas: ${profile.control_plagas}.
      Frecuencia riego: ${profile.frecuencia_riego}.
      Problemas enfrentados: ${profile.problemas_enfrentados}.
      Objetivos mejora: ${profile.objetivos_mejora}.
      Interés tecnología: ${profile.interes_tecnologia}.

    `;


    const saveSession = async (sessionName: string, systemMessage: string) => {
        const { data, error } = await supabase
          .from("sessions")
          .insert([
            {
              sessionName: sessionName,
              systemMessage: systemMessage,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
      
        if (error) {
          console.error("Supabase Error Details:", error); // Detalles del error
          throw new Error("Error saving session");
        }
      
        return data;
      };
      
    
    await saveSession(sessionName, systemMessage);

    console.log("Sesión guardada exitosamente:", sessionName);

    

    // 7. Devolver respuesta
    return new Response(
      JSON.stringify({
        sessionName,
        systemMessage,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );


    } catch (error: any) {
    console.error("Error interno en la API chat/session.ts:", error);  // Detalles completos del error
    return new Response(
      JSON.stringify({
        error: "Error interno",
        details: error.message || 'Sin detalles adicionales',
      }),
      { status: 500 }
    );
  }
};
