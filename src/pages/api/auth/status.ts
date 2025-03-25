import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/auth';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Obtener la sesión actual
    const session = await getSession({ cookies });
    
    // Determinar si el usuario está autenticado
    const isAuthenticated = !!session?.user;
    
    // Devolver el estado de autenticación
    return new Response(JSON.stringify({
      authenticated: isAuthenticated,
      user: isAuthenticated ? {
        id: session.user.id,
        email: session.user.email,
      } : null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error al verificar estado de autenticación:', error);
    return new Response(JSON.stringify({ 
      authenticated: false,
      error: 'Error al verificar autenticación',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 