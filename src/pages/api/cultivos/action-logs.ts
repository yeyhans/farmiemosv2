import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

// Tipos para mejorar legibilidad y mantenimiento
type ApiResponse = Response;
type ActionLog = { id?: string; timestamp?: string; data?: any; [key: string]: any };

// Funciones auxiliares para reducir repetición
const createResponse = (data: any, status = 200): ApiResponse => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
};

const errorResponse = (message: string, status = 500, details?: string): ApiResponse => {
  const response: Record<string, any> = { error: message, success: false };
  if (details) response.details = details;
  return createResponse(response, status);
};

const authenticateUser = async (cookies: any) => {
  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    return { error: "No autorizado (sin tokens)", status: 401 };
  }

  const { data, error } = await supabase.auth.setSession({
    refresh_token: refreshToken,
    access_token: accessToken,
  });

  if (error || !data?.user) {
    return { error: "Sesión inválida", status: 401 };
  }

  return { userId: data.user.id };
};

const getCultivoData = async (cultivoId: string, userId: string) => {
  const { data, error } = await supabase
    .from("cultivos")
    .select("actions_logs")
    .eq("id", cultivoId)
    .eq("uuid", userId)
    .single();
    
  if (error) {
    return { error: "Error al obtener datos del cultivo", status: error.code === "PGRST116" ? 404 : 500 };
  }
  
  return { data };
};

const updateCultivo = async (cultivoId: string, userId: string, actionsLogs: any[]) => {
  const { error } = await supabase
    .from("cultivos")
    .update({
      actions_logs: actionsLogs,
      updated_at: new Date().toISOString()
    })
    .eq("id", cultivoId)
    .eq("uuid", userId);
    
  return { error };
};

// Endpoints
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const auth = await authenticateUser(cookies);
    if (auth.error) return errorResponse(auth.error, auth.status);

    const { cultivoId, actions } = await request.json();
    if (!cultivoId || !actions || !Array.isArray(actions)) {
      return errorResponse("Datos incompletos o inválidos", 400);
    }

    const cultivoResult = await getCultivoData(cultivoId, auth.userId);
    if (cultivoResult.error) return errorResponse(cultivoResult.error, cultivoResult.status);
    
    const actionsLogs = Array.isArray(cultivoResult.data?.actions_logs) 
      ? [...cultivoResult.data.actions_logs, ...actions]
      : [...actions];
    
    const timestamp = new Date().toISOString();
    const updateResult = await updateCultivo(cultivoId, auth.userId, actionsLogs);
    
    if (updateResult.error) {
      return errorResponse("Error al guardar los datos en Supabase", 500);
    }
    
    return createResponse({ 
      success: true,
      actionsCount: actions.length,
      timestamp
    });
    
  } catch (error: any) {
    return errorResponse("Error al procesar las acciones", 500, error.message);
  }
};

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const url = new URL(request.url);
    const cultivoId = url.searchParams.get('cultivoId');
    if (!cultivoId) return errorResponse("Se requiere el ID del cultivo", 400);

    const auth = await authenticateUser(cookies);
    if (auth.error) return errorResponse(auth.error, auth.status);

    const cultivoResult = await getCultivoData(cultivoId, auth.userId);
    if (cultivoResult.error) return errorResponse(cultivoResult.error, cultivoResult.status);

    const actionsLogs = Array.isArray(cultivoResult.data?.actions_logs) 
      ? cultivoResult.data.actions_logs 
      : [];

    return createResponse({ success: true, actionsLogs });
    
  } catch (error: any) {
    return errorResponse("Error al obtener logs de acciones", 500, error.message);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    console.log("DELETE request recibido");
    
    const auth = await authenticateUser(cookies);
    if (auth.error) {
      console.log("Error de autenticación:", auth.error, auth.status);
      return errorResponse(auth.error, auth.status);
    }
    console.log("Usuario autenticado:", auth.userId);

    let requestBody;
    try {
      requestBody = await request.json();
      console.log("Cuerpo de la solicitud:", JSON.stringify(requestBody));
    } catch (e) {
      console.error("Error al parsear el cuerpo de la solicitud:", e);
      return errorResponse("Error al parsear el cuerpo de la solicitud", 400);
    }

    const { cultivoId, actionId } = requestBody;
    console.log("Datos recibidos - cultivoId:", cultivoId, "actionId:", actionId);
    
    if (!cultivoId || !actionId) {
      console.log("Faltan datos requeridos:", { cultivoId, actionId });
      return errorResponse("Se requiere el ID del cultivo y el ID de la acción", 400);
    }

    const cultivoResult = await getCultivoData(cultivoId, auth.userId);
    if (cultivoResult.error) {
      console.log("Error al obtener datos del cultivo:", cultivoResult.error);
      return errorResponse(cultivoResult.error, cultivoResult.status);
    }
    console.log("Datos del cultivo obtenidos correctamente");

    if (!Array.isArray(cultivoResult.data?.actions_logs)) {
      console.log("No hay registros de acciones para este cultivo");
      return errorResponse("No hay registros de acciones para este cultivo", 404);
    }
    console.log("Total de acciones encontradas:", cultivoResult.data.actions_logs.length);

    // Verificamos si la acción existe antes de eliminarla
    const actionExists = cultivoResult.data.actions_logs.some(entry => 
      entry.id === actionId || entry.timestamp === actionId
    );
    console.log("¿Acción encontrada?:", actionExists);
    
    if (!actionExists) {
      console.log("Acción no encontrada con ID/timestamp:", actionId);
      console.log("IDs disponibles:", cultivoResult.data.actions_logs.map(log => log.id));
      console.log("Timestamps disponibles:", cultivoResult.data.actions_logs.map(log => log.timestamp));
      return errorResponse("La acción especificada no existe", 404);
    }

    // Filtramos para eliminar la acción por su ID único o timestamp
    const updatedLogs = cultivoResult.data.actions_logs.filter(entry => 
      entry.id !== actionId && entry.timestamp !== actionId
    );
    console.log("Acciones después de filtrar:", updatedLogs.length);

    const updateResult = await updateCultivo(cultivoId, auth.userId, updatedLogs);
    if (updateResult.error) {
      console.log("Error al actualizar cultivo:", updateResult.error);
      return errorResponse("Error al actualizar los registros de acciones", 500);
    }
    console.log("Actualización exitosa");

    return createResponse({ 
      success: true, 
      message: "Acción eliminada correctamente",
      remainingActions: updatedLogs.length
    });

  } catch (error: any) {
    console.error("Error general en DELETE:", error);
    return errorResponse("Error al eliminar registro de acción", 500, error.message);
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const auth = await authenticateUser(cookies);
    if (auth.error) return errorResponse(auth.error, auth.status);

    const { cultivoId, actionId, updatedData } = await request.json();
    if (!cultivoId || !actionId || !updatedData) {
      return errorResponse("Datos incompletos", 400);
    }

    const cultivoResult = await getCultivoData(cultivoId, auth.userId);
    if (cultivoResult.error) return errorResponse(cultivoResult.error, cultivoResult.status);

    if (!Array.isArray(cultivoResult.data?.actions_logs)) {
      return errorResponse("No hay registros de acciones para este cultivo", 404);
    }

    const updatedLogs = cultivoResult.data.actions_logs.map(log => {
      if ((log.id && log.id === actionId) || log.timestamp === actionId) {
        return { ...log, data: updatedData };
      }
      return log;
    });

    const updateResult = await updateCultivo(cultivoId, auth.userId, updatedLogs);
    if (updateResult.error) {
      return errorResponse("Error al actualizar los registros de acciones", 500);
    }

    return createResponse({ success: true, message: "Acción actualizada correctamente" });

  } catch (error: any) {
    return errorResponse("Error al actualizar registro de acción", 500, error.message);
  }
};
