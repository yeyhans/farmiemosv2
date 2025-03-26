import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import sharp from 'sharp';

// Nombre del bucket para imágenes de la comunidad
const BUCKET_NAME = "comunidad";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('🚀 Iniciando creación de post...');
    
    // Verificación de tokens
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    console.log('🔑 Tokens:', { 
      accessToken: !!accessToken, 
      refreshToken: !!refreshToken 
    });

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No autorizado (sin tokens)." 
        }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Configuración de sesión
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: sessionError?.message || "No autorizado (tokens inválidos)." 
        }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = sessionData.user;

    // Procesamiento del FormData
    const formData = await request.formData();
    console.log('📝 FormData recibido:', Object.fromEntries(formData.entries()));
    
    const validateField = (field: FormDataEntryValue | null): string | null =>
      field?.toString().trim() || null;

    // Verificar si hay archivos multimedia
    let mediaUrls = [];
    const mediaFiles = formData.getAll("media_file") as File[];
    
    if (mediaFiles.length > 0) {
      for (const mediaFile of mediaFiles) {
        if (mediaFile && mediaFile.size > 0) {
          try {
            const buffer = await mediaFile.arrayBuffer();
            let optimizedBuffer;
            
            // Procesar según el tipo de archivo
            if (mediaFile.type.startsWith('image/')) {
              optimizedBuffer = await sharp(Buffer.from(buffer))
                .resize({ width: 1200, height: 1200, fit: 'inside' })
                .webp({ quality: 85 })
                .toBuffer();
            } else {
              continue; // Saltamos archivos que no son imágenes
            }

            // Generar nombre de archivo único
            const fileName = `post_${user.id}_${Date.now()}_${mediaUrls.length}.webp`;
            
            // Subir el archivo
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from(BUCKET_NAME)
              .upload(`posts/${fileName}`, optimizedBuffer, {
                contentType: 'image/webp',
                cacheControl: '3600',
                upsert: true
              });

            if (uploadError) {
              console.error(`Error al subir archivo: ${uploadError.message}`);
              continue;
            }

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(`posts/${fileName}`);
            
            mediaUrls.push(publicUrl);
          } catch (mediaError) {
            console.error("Error procesando archivo multimedia:", mediaError);
          }
        }
      }
    }

    // Preparar datos del post
    const postData = {
      user_id: user.id,
      title: validateField(formData.get("title")),
      content: validateField(formData.get("content")),
      type: validateField(formData.get("type")), // texto, multimedia, enlace, encuesta
      media_url: mediaUrls.join(','), // Unimos las URLs con comas
      link_url: validateField(formData.get("link_url")),
      poll_question: validateField(formData.get("poll_question")),
      poll_options: validateField(formData.get("poll_options")), // Puede ser un JSON string con las opciones
      comments: [], // Inicializamos el array vacío para los comentarios en formato JSONB
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('📦 Datos del post a insertar:', postData);

    // Insertar el post en la base de datos
    const { data: newPost, error: postError } = await supabase
      .from('comunidad')
      .insert(postData)
      .select()
      .single();

    if (postError) {
      console.error('❌ Error al insertar post:', postError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: postError.message,
          details: postError.details 
        }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log('✅ Post creado exitosamente:', newPost);
    return new Response(
      JSON.stringify({ 
        success: true, 
        post: newPost 
      }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Error inesperado:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error)
      }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
