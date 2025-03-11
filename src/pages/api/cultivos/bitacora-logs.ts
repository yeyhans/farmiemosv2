import type { APIRoute } from "astro";
import OpenAI from "openai";
import { supabase } from "../../../lib/supabase";
import sharp from 'sharp';

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

// Nombre del bucket para imágenes
const BUCKET_NAME = "farmiemos-storage"; // Usa un bucket que ya existe por defecto en Supabase

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Validación de sesión con Supabase
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: "No autorizado (sin tokens)" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(
        JSON.stringify({ error: "Sesión inválida" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = sessionData.user.id;

    // Parsear el FormData
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    const cultivoId = formData.get("cultivoId") as string; 
    const notaUsuario = formData.get("note") as string;
    const customTimestamp = formData.get("timestamp") as string;
    
    if (!imageFile) {
      return new Response(
        JSON.stringify({ error: "No se ha proporcionado ninguna imagen" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Convertir la imagen a un buffer para su procesamiento
    const buffer = await imageFile.arrayBuffer();

    // Si estamos en modo solo descripción (sin guardar)
    const modoSoloDescripcion = !cultivoId;
    
    // 2. Convertir imagen a base64 para el análisis con OpenAI
    let description = notaUsuario;
    let tokenUsage = null; // Inicializar como null en lugar de objeto con ceros

    if (!description || description.trim() === '') {
      const base64Image = Buffer.from(buffer).toString("base64");
      
      // Enviar la imagen a OpenAI para análisis
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe el detalle de la planta que se visualiza en la imagen. No menciones el tipo de planta, solo describe el detalle de la planta." },
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageFile.type};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
      });
      
      // Extraer la descripción generada
      description = response.choices[0]?.message?.content || 
        "No se pudo generar una descripción para esta imagen.";
        
      // Asignar los datos de uso de tokens solo cuando se usa la API
      if (response.usage) {
        tokenUsage = {
          prompt_tokens: response.usage.prompt_tokens || 0,
          completion_tokens: response.usage.completion_tokens || 0,
          total_tokens: response.usage.total_tokens || 0
        };
      }
      
      // Log para depuración - solo relevante cuando se usa la API
      console.log("Token usage from API:", response.usage);
      console.log("Assigned token usage:", tokenUsage);
    }
    // Nota: tokenUsage seguirá siendo null si no se llamó a OpenAI
    
    // Si es solo para obtener la descripción, devolver respuesta aquí
    if (modoSoloDescripcion) {
      return new Response(
        JSON.stringify({
          success: true, 
          description,
          tokenUsage: tokenUsage // Será null si no se llamó a OpenAI
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Optimizar la imagen y convertirla a WebP
    const optimizedBuffer = await sharp(Buffer.from(buffer))
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }) // Redimensionar manteniendo proporción
      .webp({ quality: 80 }) // Convertir a WebP con calidad del 80%
      .toBuffer();

    // Cambiar el nombre del archivo para usar extensión WebP
    const originalName = imageFile.name.replace(/\s+/g, '_').replace(/\.[^.]+$/, '');
    const fileName = `bitacora_${Date.now()}_${originalName}.webp`;
    const filePath = fileName; // No usar subdirectorios para evitar problemas con RLS
    
    // Subir la imagen optimizada
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, optimizedBuffer, {
        contentType: 'image/webp', // Cambiar el tipo de contenido a WebP
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error("Error al subir a Supabase Storage:", uploadError);
      return new Response(
        JSON.stringify({ 
          error: "Error al almacenar la imagen", 
          details: uploadError.message 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. SEGUNDO: Obtener la URL pública de la imagen
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    // 4. TERCERO: Crear la entrada de bitácora
    const timestamp = customTimestamp || new Date().toISOString();
    const bitacoraEntry = {
      timestamp,
      descripcion: description,
      url_image: publicUrl,
      tokenUsage: tokenUsage,
      metadata: {
        fileName,
        fileType: 'image/webp',
        fileSize: optimizedBuffer.length,
        originalSize: imageFile.size,
        optimized: true
      }
    };
    
    // Obtener el registro actual de bitacora_logs
    const { data: cultivoData, error: cultivoError } = await supabase
      .from("cultivos")
      .select("bitacora_logs")
      .eq("id", cultivoId)
      .eq("uuid", userId)
      .single();
    
    if (cultivoError && cultivoError.code !== "PGRST116") {
      console.error("Error al obtener datos del cultivo:", cultivoError);
      return new Response(
        JSON.stringify({ error: "Error al obtener datos del cultivo" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Crear o actualizar el array de bitacora_logs
    const bitacoraLogs = Array.isArray(cultivoData?.bitacora_logs) 
      ? [...cultivoData.bitacora_logs, bitacoraEntry]
      : [bitacoraEntry];
    
    // Actualizar el registro en Supabase
    const { error: updateError } = await supabase
      .from("cultivos")
      .update({
        bitacora_logs: bitacoraLogs,
        updated_at: timestamp
      })
      .eq("id", cultivoId)
      .eq("uuid", userId);
    
    if (updateError) {
      console.error("Error al actualizar bitacora_logs:", updateError);
      return new Response(
        JSON.stringify({ error: "Error al guardar los datos en Supabase" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Devolver la respuesta con información completa
    return new Response(
      JSON.stringify({ 
        success: true,
        description,
        imageUrl: publicUrl,
        timestamp,
        tokenUsage: tokenUsage
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error("Error al procesar la imagen:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Error al procesar la imagen", 
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const cultivoId = url.searchParams.get('cultivoId');
    const userId = url.searchParams.get('userId');

    if (!cultivoId) {
      return new Response(
        JSON.stringify({ error: "Se requiere el ID del cultivo" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validación de sesión con Supabase
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: "No autorizado (sin tokens)" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(
        JSON.stringify({ error: "Sesión inválida" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verificar que el usuario tenga acceso al cultivo
    const { data: cultivoData, error: cultivoError } = await supabase
      .from("cultivos")
      .select("bitacora_logs")
      .eq("id", cultivoId)
      .eq("uuid", sessionData.user.id)
      .single();
    
    if (cultivoError) {
      return new Response(
        JSON.stringify({ 
          error: "Error al obtener datos del cultivo", 
          details: cultivoError.message 
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Obtener los logs de bitácora
    const bitacoraLogs = Array.isArray(cultivoData?.bitacora_logs) 
      ? cultivoData.bitacora_logs 
      : [];

    return new Response(
      JSON.stringify({ 
        success: true,
        bitacoraLogs 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error("Error al obtener logs de bitácora:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Error al procesar la solicitud", 
        details: error.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    // Validación de sesión con Supabase
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado (sin tokens)" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Sesión inválida" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = sessionData.user.id;
    const body = await request.json();
    const { cultivoId, timestamp } = body;

    if (!cultivoId || !timestamp) {
      return new Response(
        JSON.stringify({ success: false, error: "Datos incompletos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Obtener el registro actual
    const { data: cultivoData, error: cultivoError } = await supabase
      .from("cultivos")
      .select("bitacora_logs")
      .eq("id", cultivoId)
      .eq("uuid", userId)
      .single();

    if (cultivoError) {
      return new Response(
        JSON.stringify({ success: false, error: "Error al obtener datos del cultivo" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verificar que existan logs de bitácora
    if (!Array.isArray(cultivoData?.bitacora_logs)) {
      return new Response(
        JSON.stringify({ success: false, error: "No hay entradas de bitácora para este cultivo" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Encontrar la entrada a eliminar para obtener el nombre del archivo
    const entryToDelete = cultivoData.bitacora_logs.find(entry => entry.timestamp === timestamp);
    
    if (!entryToDelete) {
      return new Response(
        JSON.stringify({ success: false, error: "Entrada no encontrada" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Extraer el nombre del archivo de la URL o de los metadatos
    const fileName = entryToDelete.metadata?.fileName;
    
    // Eliminar el archivo del storage si tenemos el nombre
    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([fileName]);
        
      if (storageError) {
        console.error("Error al eliminar imagen del storage:", storageError);
        // No fallamos la operación principal si falla la eliminación del archivo
      }
    }

    // Filtrar la entrada eliminada
    const updatedLogs = cultivoData.bitacora_logs.filter(entry => entry.timestamp !== timestamp);

    // Actualizar en Supabase
    const { error: updateError } = await supabase
      .from("cultivos")
      .update({
        bitacora_logs: updatedLogs,
        updated_at: new Date().toISOString()
      })
      .eq("id", cultivoId)
      .eq("uuid", userId);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: "Error al actualizar la bitácora" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Entrada eliminada correctamente" 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error al eliminar entrada de bitácora:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Error al procesar la solicitud",
        details: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};