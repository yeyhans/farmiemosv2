import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificación de tokens
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No autorizado" 
        }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Configurar sesión
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Sesión inválida" 
        }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { postId, content } = await request.json();

    // Obtener post actual y sus comentarios
    const { data: post, error: postError } = await supabase
      .from('comunidad')
      .select('comments, comments_count')
      .eq('id', postId)
      .single();

    if (postError) {
      throw postError;
    }

    const newComment = {
      id: crypto.randomUUID(),
      user_id: sessionData.user.id,
      user_name: sessionData.user.email?.split('@')[0], // O cualquier otro dato del usuario
      content: content,
      created_at: new Date().toISOString()
    };

    const updatedComments = [...(post.comments || []), newComment];

    // Actualizar post con nuevo comentario
    const { data: updatedPost, error: updateError } = await supabase
      .from('comunidad')
      .update({
        comments: updatedComments,
        comments_count: (post.comments_count || 0) + 1
      })
      .eq('id', postId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        comment: newComment,
        comments: updatedPost.comments
      }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error al procesar comentario:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error al procesar el comentario"
      }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}; 