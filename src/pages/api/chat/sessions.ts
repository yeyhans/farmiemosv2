import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const ALL: APIRoute = async ({ request, cookies }) => {
  try {
    const method = request.method.toUpperCase();

    // Verificar tokens de sesión (aplicable a todos los métodos)
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado (sin tokens)." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado (tokens inválidos)." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const user = sessionData.user;

    if (method === "GET") {
      // Lógica para obtener registros
      const { data: logs, error } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ success: true, data: logs }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else if (method === "POST") {
      // Lógica para insertar registros


 
      const session_name = "Session Nueva";
      const session_description = " test ";
      const system_message = " test ";

    
    

      const { data: inserted, error } = await supabase
        .from("chats")
        .insert([
          {
            user_id: user.id,
            session_name,
            session_description,            
            system_message,
            user_prompt: [],
            ai_response: [],
            updated_at: new Date().toISOString(),
          },
        ])
        .select("id") // Seleccionar solo el ID del registro insertado
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Devolver el ID de la sesión creada
      return new Response(
        JSON.stringify({ success: true, sessionId: inserted.id }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (method === "DELETE") {
      // Lógica para eliminar registros
      const url = new URL(request.url);
      const id = url.searchParams.get("id");

      if (!id) {
        return new Response(
          JSON.stringify({ success: false, error: "ID de registro no proporcionado." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const { error } = await supabase
        .from("chats")
        .delete()
        .eq("user_id", user.id)
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Registro eliminado correctamente." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      // Respuesta para métodos no soportados
      return new Response(
        JSON.stringify({ success: false, error: "Método no permitido." }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (err: any) {
    console.error("Error en ALL /api/chat/sessions:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};