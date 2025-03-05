import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Document ID is required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: user } = await supabase.auth.getUser();

    const userId = user.user?.id;

    // First, get the document to retrieve its file path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching document:', fetchError);
      throw fetchError;
    }
    
    if (!document) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Document not found' 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path]);
    
    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete the document record from the database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (dbError) {
      console.error('Error deleting document from database:', dbError);
      throw dbError;
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: storageError 
          ? 'Document deleted from database but failed to delete from storage' 
          : 'Document deleted successfully' 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error deleting document:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
