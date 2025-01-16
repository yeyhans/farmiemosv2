import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";

/**
 * Este endpoint manejará tanto la obtención (GET) como la inserción (POST)
 * de los registros VPD/Dewpoint en la tabla "calculator_logs".
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Verificar si tenemos tokens de sesión
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado (sin tokens)." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Establecer la sesión en Supabase
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

    // 3. Obtener los registros de la tabla `calculator_logs`
    const { data: logs, error } = await supabase
      .from("calculator_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }); // O el orden que prefieras

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Devolver los registros
    return new Response(JSON.stringify({ success: true, data: logs }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error en GET /api/calculator:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Verificar si tenemos tokens de sesión
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado (sin tokens)." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Establecer la sesión en Supabase
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

    // 3. Leer los valores enviados en el body
    //    Nota: Puede que los envíes como JSON o como FormData. Adapta el parseo según tu frontend.
    //    Aquí ejemplifico usando FormData (similar a tu formulario de ejemplo).
    const formData = await request.formData();

    // Función para limpiar los campos
    const validateNumber = (field: FormDataEntryValue | null) => {
      const val = field?.toString().trim();
      if (!val) return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    const notes = formData.get("notes");
    const temp = validateNumber(formData.get("temp"));
    const humidity = validateNumber(formData.get("humidity"));
    const vpd = validateNumber(formData.get("vpd"));
    const dewpoint = validateNumber(formData.get("dewpoint"));

    // 4. Validar campos requeridos
    if (temp === null || humidity === null || vpd === null || dewpoint === null) {
      return new Response(
        JSON.stringify({ success: false, error: "Faltan o son inválidos algunos campos requeridos." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Insertar el nuevo registro en la tabla "calculator_logs"
    const { data: inserted, error } = await supabase
      .from("calculator_logs")
      .insert([
        {
          user_id: user.id,
          notes,
          temp,
          humidity,
          vpd,
          dewpoint,
        },
      ])
      .single();

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 6. Retornar el registro recién insertado
    return new Response(JSON.stringify({ success: true, data: inserted }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error en POST /api/calculator:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
    try {
      // 1. Verificar tokens de sesión
      const accessToken = cookies.get("sb-access-token")?.value;
      const refreshToken = cookies.get("sb-refresh-token")?.value;
  
      if (!accessToken || !refreshToken) {
        return new Response(JSON.stringify({ success: false, error: "No autorizado (sin tokens)." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
  
      // 2. Establecer sesión
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
  
      // 3. Obtener el ID del registro desde la URL
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "ID de registro no proporcionado." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
  
      // 4. Eliminar el registro que coincida con user_id e id
      const { error } = await supabase
        .from("calculator_logs")
        .delete()
        .eq("user_id", user.id)
        .eq("id", id);
  
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
  
      // 5. Confirmar eliminación
      return new Response(JSON.stringify({ success: true, message: "Registro eliminado correctamente." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("Error en DELETE /api/calculator:", err);
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
  