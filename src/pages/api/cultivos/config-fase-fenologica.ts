import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const ALL: APIRoute = async ({ request, cookies }) => {
  try {
    const method = request.method.toUpperCase();
    console.log(`[API] Received ${method} request to config-fase-fenologica`);

    // Verificar tokens de sesión
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      console.log("[API] Authorization failed: Missing tokens");
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado (sin tokens)." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      console.log("[API] Authorization failed: Invalid tokens", sessionError);
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado (tokens inválidos)." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const user = sessionData.user;
    console.log(`[API] Authorized user: ${user.id}`);

    // Manejar método DELETE
    if (method === "DELETE") {
      const body = await request.json();
      const { id, fase } = body;
      console.log(`[API] Deleting phase: id=${id}, fase=${fase}`);

      if (!id || !fase) {
        return new Response(
          JSON.stringify({ success: false, error: "Datos incompletos" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Obtener el cultivo actual
      const { data: cultivoData, error: cultivoError } = await supabase
        .from("cultivos")
        .select("fases_fenologicas")
        .eq("id", id)
        .eq("uuid", user.id)
        .single();

      if (cultivoError) {
        console.error("[API] Error fetching crop data:", cultivoError);
        return new Response(
          JSON.stringify({ success: false, error: cultivoError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      let fasesFenologicas = cultivoData?.fases_fenologicas || {};
      
      // Eliminar la fase especificada
      if (fasesFenologicas[fase]) {
        delete fasesFenologicas[fase];
      }

      // Actualizar el registro
      const { error: updateError } = await supabase
        .from("cultivos")
        .update({ 
          fases_fenologicas: fasesFenologicas,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("uuid", user.id);

      if (updateError) {
        console.error("[API] Error updating crop:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Fase fenológica eliminada",
          data: { 
            fase, 
            fasesFenologicas
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Manejar método PUT (código existente)
    if (method === "PUT") {
      const body = await request.json();
      const { id, fase, fecha } = body;
      console.log(`[API] Received data: id=${id}, fase=${fase}, fecha=${fecha}`);

      if (!id || !fase) {
        console.log("[API] Missing required data");
        return new Response(
          JSON.stringify({ success: false, error: "Datos incompletos" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Comprobar que la fase es válida
      const fasesValidas = ["propagacion", "crecimiento", "floracion", "cosecha"];
      if (!fasesValidas.includes(fase)) {
        console.log(`[API] Invalid phase: ${fase}`);
        return new Response(
          JSON.stringify({ success: false, error: "Fase fenológica no válida" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Fecha a usar (la proporcionada o la actual)
      const fechaRegistro = fecha || new Date().toISOString();
      console.log(`[API] Using date: ${fechaRegistro}`);

      // Obtener el cultivo actual
      console.log(`[API] Fetching crop data for id=${id}, user=${user.id}`);
      const { data: cultivoData, error: cultivoError } = await supabase
        .from("cultivos")
        .select("fases_fenologicas")
        .eq("id", id)
        .eq("uuid", user.id)
        .single();

      if (cultivoError) {
        console.error("[API] Error fetching crop data:", cultivoError);
        
        // Verificar si el error es por columna no existente
        if (cultivoError.message.includes("column cultivos.fases_fenologicas does not exist")) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "La columna fases_fenologicas no existe en la base de datos. Por favor, ejecuta la migración SQL necesaria." 
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: false, error: cultivoError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      
      console.log("[API] Current phases:", cultivoData?.fases_fenologicas);

      // Preparar los datos de fases
      let fasesFenologicas = cultivoData?.fases_fenologicas || {};
      
      // Determinar el índice de la fase actual
      const faseActualIndex = fasesValidas.indexOf(fase);
      console.log(`[API] Current phase index: ${faseActualIndex}`);
      
      // Cerrar la fase anterior si existe y no tiene fecha de fin
      for (let i = 0; i < faseActualIndex; i++) {
        const faseAnterior = fasesValidas[i];
        console.log(`[API] Checking previous phase: ${faseAnterior}`);
        
        if (fasesFenologicas[faseAnterior] && 
            typeof fasesFenologicas[faseAnterior] === 'object' && 
            fasesFenologicas[faseAnterior].start && 
            !fasesFenologicas[faseAnterior].end) {
          // Cerrar la fase anterior con la fecha actual
          console.log(`[API] Closing previous phase: ${faseAnterior}`);
          fasesFenologicas[faseAnterior].end = fechaRegistro;
        } else if (fasesFenologicas[faseAnterior] && 
                   typeof fasesFenologicas[faseAnterior] === 'string') {
          // Migrar el formato antiguo (solo fecha de inicio) al nuevo formato
          console.log(`[API] Migrating previous phase format: ${faseAnterior}`);
          fasesFenologicas[faseAnterior] = {
            start: fasesFenologicas[faseAnterior],
            end: fechaRegistro
          };
        }
      }
      
      // Actualizar la fase actual
      console.log(`[API] Updating current phase: ${fase}`);
      
      // Si ya existe la fase en formato antiguo, convertirla
      if (fasesFenologicas[fase] && typeof fasesFenologicas[fase] === 'string') {
        console.log(`[API] Converting old format for phase: ${fase}`);
        fasesFenologicas[fase] = {
          start: fasesFenologicas[fase],
          end: null
        };
      } 
      // Si ya existe en formato nuevo, actualizar solo si no tiene fecha de inicio
      else if (!fasesFenologicas[fase] || !fasesFenologicas[fase].start) {
        console.log(`[API] Setting start date for phase: ${fase}`);
        fasesFenologicas[fase] = {
          start: fechaRegistro,
          end: null
        };
      }
      // Si existe y tiene fecha de inicio, solo actualizar la fecha de fin
      else if (fasesFenologicas[fase] && fasesFenologicas[fase].start) {
        // Si es la misma fase que ya está activa, solo actualizar end si está vacío
        if (!fasesFenologicas[fase].end) {
          console.log(`[API] Setting end date for active phase: ${fase}`);
          fasesFenologicas[fase].end = fechaRegistro;
        } else {
          // Si ya tenía end, reiniciar la fase (comenzar un nuevo ciclo)
          console.log(`[API] Restarting completed phase: ${fase}`);
          fasesFenologicas[fase] = {
            start: fechaRegistro,
            end: null
          };
        }
      }

      console.log("[API] Updated phases:", fasesFenologicas);

      // Actualizar el registro
      console.log(`[API] Updating database record for crop id=${id}`);
      const { error: updateError } = await supabase
        .from("cultivos")
        .update({ 
          fases_fenologicas: fasesFenologicas,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("uuid", user.id);

      if (updateError) {
        console.error("[API] Error updating crop:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("[API] Update successful, returning response");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Fase fenológica registrada",
          data: { 
            fase, 
            fasesFenologicas
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Method not allowed: ${method}`);
    return new Response(
      JSON.stringify({ success: false, error: "Método no permitido" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error en ALL /api/cultivos/config-fase-fenologica:", err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message,
        details: err.details || "No hay detalles adicionales disponibles"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}; 