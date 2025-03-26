import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No autorizado"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Verificar sesión
    const { data: { user }, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Sesión inválida"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Obtener el ID del post
    const { post_id } = await request.json();

    if (!post_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ID del post requerido"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Verificar si el usuario ya dio like
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select()
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .single();

    let action;
    if (existingLike) {
      // Remover like
      action = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post_id)
        .eq('user_id', user.id);

      // Decrementar contador (corregido)
      await supabase
        .from('comunidad')
        .update({ 
          likes_count: existingLike ? 0 : 1 
        })
        .eq('id', post_id);
    } else {
      // Agregar like
      action = await supabase
        .from('post_likes')
        .insert({
          post_id,
          user_id: user.id
        });

      // Incrementar contador (corregido)
      await supabase
        .from('comunidad')
        .update({ 
          likes_count: existingLike ? 0 : 1 
        })
        .eq('id', post_id);
    }

    if (action.error) {
      throw new Error(action.error.message);
    }

    // Obtener contador actualizado
    const { data: updatedPost } = await supabase
      .from('comunidad')
      .select('likes_count')
      .eq('id', post_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        liked: !existingLike,
        likes_count: updatedPost?.likes_count || 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error('Error al procesar like:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error al procesar la solicitud"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
