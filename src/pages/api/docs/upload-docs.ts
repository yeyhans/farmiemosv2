import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const documentFile = formData.get('document') as File;
    const documentTitle = formData.get('title') as string;
    const documentDescription = formData.get('description') as string;
    
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;
    
    console.log('Received upload request:', {
      title: documentTitle,
      description: documentDescription,
      fileName: documentFile?.name,
      fileSize: documentFile?.size,
      fileType: documentFile?.type
    });
    
    if (!documentFile || !documentTitle) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar que el archivo no sea demasiado grande (10MB como ejemplo)
    if (documentFile.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'File size exceeds the 10MB limit' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Upload file to Supabase Storage
    const fileName = `${Date.now()}_${documentFile.name}`;
    console.log('Uploading file to Supabase:', fileName);
    
    // Convertir el archivo a ArrayBuffer para Supabase
    const fileBuffer = await documentFile.arrayBuffer();
    
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, fileBuffer, {
        contentType: documentFile.type,
        cacheControl: '3600'
      });
    
    if (error) {
      console.error('Supabase storage error:', error);
      throw error;
    }
    
    console.log('File uploaded successfully:', data);
    
    // Save metadata to Supabase database
    const { error: dbError, data: documentData } = await supabase
      .from('documents')
      .insert({
        title: documentTitle,
        description: documentDescription,
        file_path: data.path,
        file_size: documentFile.size,
        file_type: documentFile.type,
        uploaded_at: new Date().toISOString(),
        user_id: userId
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('Supabase database error:', dbError);
      throw dbError;
    }
    
    console.log('Document metadata saved:', documentData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        document: documentData 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error uploading document:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: JSON.stringify(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 