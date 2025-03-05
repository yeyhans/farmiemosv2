import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, title, description } = await request.json();
    const { data: user } = await supabase.auth.getUser();

    const userId = user.user?.id;

    if (!id || !title) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Document ID and title are required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update the document in the database
    const { data, error } = await supabase
      .from('documents')
      .update({
        title,
        description
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating document:', error);
      throw error;
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        document: data,
        message: 'Document updated successfully' 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error updating document:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}