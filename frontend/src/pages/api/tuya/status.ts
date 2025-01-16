import type { APIRoute } from 'astro';
import { supabase } from "../../../lib/supabase";
import { TuyaContext } from '@tuya/tuya-connector-nodejs';

const context = new TuyaContext({
  baseUrl: 'https://openapi.tuyaus.com',
  accessKey: import.meta.env.PUBLIC_TUYA_ACCESS_KEY,
  secretKey: import.meta.env.PUBLIC_TUYA_SECRET_KEY,
});

export const GET: APIRoute = async ({ request }) => {
    try {
      const url = new URL(request.url);
      const deviceId = url.searchParams.get("deviceId");
  
      // Verificamos que exista
      if (!deviceId) {
        return new Response(JSON.stringify({ error: "No se proporcionó deviceId" }), { status: 400 });
      }
  
      const accessKey = import.meta.env.PUBLIC_TUYA_ACCESS_KEY;
      const secretKey = import.meta.env.PUBLIC_TUYA_SECRET_KEY;
  
      if (!accessKey || !secretKey) {
        return new Response(JSON.stringify({ error: "Las claves de Tuya no están configuradas correctamente" }), { status: 500 });
      }
  
      // Obtener información básica del dispositivo
      const deviceStatus = await context.request({
        path: `/v1.0/iot-03/devices/${deviceId}/status`,
        method: 'GET',
      });
  
      if (!deviceStatus.success) {
        console.error("Respuesta completa de Tuya:", JSON.stringify(deviceStatus));
        return new Response(JSON.stringify({ 
          error: 'Error al obtener el estado del dispositivo Tuya',
          details: deviceStatus
        }), { status: 500 });
      }
  
      const status = deviceStatus.result;
  
      return new Response(
        JSON.stringify({
          tuyaAccessKey: accessKey,
          tuyaSecretKey: secretKey,
          deviceId,
          deviceStatus: status
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
  
    } catch (error: any) {
      console.error("Error interno:", error);
      return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), { status: 500 });
    }
  };
  