import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import sharp from 'sharp';

// Nombre del bucket para imágenes
const BUCKET_NAME = "profile-images";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificación de tokens
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

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
    
    // Debug para ver qué hay en formData
    console.log("FormData keys:", [...formData.keys()]);
    
    const validateField = (field: FormDataEntryValue | null): string | null =>
      field?.toString().trim() || null;

    // Verificar si hay un archivo de avatar
    let avatarUrl = null;
    const avatarFile = formData.get("avatar_image") as File;
    
    console.log("Avatar file received:", avatarFile ? {
      name: avatarFile.name,
      type: avatarFile.type,
      size: avatarFile.size
    } : 'No file');
    
    if (avatarFile && avatarFile.size > 0) {
      try {
        // Procesar la imagen
        const buffer = await avatarFile.arrayBuffer();
        
        // Optimizar la imagen
        const optimizedBuffer = await sharp(Buffer.from(buffer))
          .resize({ width: 300, height: 300, fit: 'cover' }) // Recortar y centrar para avatar
          .webp({ quality: 85 }) // Convertir a WebP con buena calidad
          .toBuffer();

        // Generar nombre de archivo único
        const fileName = `avatar_${user.id}_${Date.now()}.webp`;
        
        console.log("Subiendo avatar con nombre:", fileName);
        
        // Verificar si existe la carpeta avatars, si no, crearla
        const { data: dirData, error: dirError } = await supabase.storage
          .from(BUCKET_NAME)
          .list();
        
        // Crear la carpeta si no existe
        let folderPath = '';
        if (!dirData?.some(item => item.name === 'avatars' && item.id === null)) {
          folderPath = 'avatars/';
        }
        
        // Subir la imagen optimizada
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(`${folderPath}${fileName}`, optimizedBuffer, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error("Error al subir avatar:", uploadError);
          throw new Error(`Error al subir imagen: ${uploadError.message}`);
        }

        // Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(`${folderPath}${fileName}`);
        
        console.log("URL pública del avatar:", publicUrl);
        avatarUrl = publicUrl;
      } catch (imageError) {
        console.error("Error procesando imagen:", imageError);
        // Continuamos sin avatar en caso de error, pero logueamos
      }
    }

    // Preparar datos del perfil
    const profileData: any = {
      user_id: user.id,
      user_name: validateField(formData.get("user_name")),
      experience_level: validateField(formData.get("experience_level")),
      comuna: validateField(formData.get("comuna")),
      cultivo_principal: validateField(formData.get("cultivo_principal")),
      escala_cultivo: validateField(formData.get("escala_cultivo")),
      motivacion: validateField(formData.get("motivacion")),
      desc_obj: validateField(formData.get("desc_obj")),
      problemas_enfrentados: validateField(formData.get("problemas_enfrentados")),
      instagram: validateField(formData.get("instagram")),
      
      // Añadir campos de InterestsSection
      areas_interes: validateField(formData.get("areas_interes")),
      objetivos_aprendizaje: validateField(formData.get("objetivos_aprendizaje")),
      contenido_preferido: validateField(formData.get("contenido_preferido")),
      intereses_adicionales: validateField(formData.get("intereses_adicionales")),
      
      // Mantener campos existentes de intereses
      interes_tecnologia: validateField(formData.get("interes_tecnologia")),
      desc_interes: validateField(formData.get("desc_interes")),
      
      updated_at: new Date().toISOString(),
    };

    // Asignar URL del avatar si existe
    if (avatarUrl) {
      profileData.img_avatar = avatarUrl;
      console.log("Guardando URL de avatar en img_avatar:", avatarUrl);
    }

    console.log("Datos de perfil a guardar:", profileData);

    // Primero, intentamos verificar si existe un perfil
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select()
      .eq('user_id', user.id)
      .single();

    let result;
    
    if (existingProfile) {
      console.log("Actualizando perfil existente");
      // Si existe, actualizamos
      result = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single();
    } else {
      console.log("Creando nuevo perfil");
      // Si no existe, insertamos y usamos avatar de Google si no hay avatar personalizado
      if (!avatarUrl) {
        const googleAvatar = user.user_metadata?.avatar_url;
        if (googleAvatar) {
          profileData.img_avatar = googleAvatar;
          console.log("Usando avatar de Google:", googleAvatar);
        }
      }
      
      result = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();
    }

    const { data: updatedProfile, error: operationError } = result;

    if (operationError) {
      console.error("Error en la operación:", operationError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: operationError.message,
          details: operationError.details 
        }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Perfil guardado exitosamente:", updatedProfile);

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: updatedProfile 
      }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error inesperado:", error);
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