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
        .from("cultivos")
        .select("*")
        .eq("uuid", user.id)
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


 
      const body = await request.json();
      const { descripcion } = body;
      console.log(body);

      if (!body || typeof body !== "object") {
        throw new Error("Datos inválidos");
      }

      console.log('Attempting to insert with user ID:', user.id);

      const { data: inserted, error } = await supabase
        .from("cultivos")
        .insert([
          {
            uuid: user.id,
            descripcion: descripcion || "Sin descripción",
            iluminacion: {},
            ambiente: {},
            config: {},
            suelo: {},
            plantas: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select("id") // Seleccionar solo el ID del registro insertado
        .single();

      console.log('Inserted data:', inserted, error);
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
        JSON.stringify({ success: true, id: inserted.id }),
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
        .from("cultivos")
        .delete()
        .eq("uuid", user.id)
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
    console.error("Error en ALL /api/cultivos/crear-cultivo:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};