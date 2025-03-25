import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { getSession } from '../../../lib/auth'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Solo permitir método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obtener la sesión actual del usuario
    const session = await getSession(req);
    
    if (!session || !session.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    // Obtener los cultivos del usuario desde Supabase
    const { data, error } = await supabase
      .from('cultivos')
      .select('*')
      .eq('uuid', session.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error al consultar cultivos:', error);
      return res.status(500).json({ error: 'Error al obtener cultivos' });
    }
    
    // Devolver los cultivos como JSON
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
} 