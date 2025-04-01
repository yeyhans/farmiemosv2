import type { APIRoute } from 'astro';
import { MongoClient } from 'mongodb';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const GET: APIRoute = async ({ params, request }) => {
  const client = new MongoClient(import.meta.env.MONGODB_URI_SEEDFINDER);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(
    parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT)),
    MAX_LIMIT
  );
  const search = url.searchParams.get('search') || '';
  
  // Decodificar el nombre del breeder de los parámetros
  const breeder = params.breeder ? decodeURIComponent(params.breeder) : '';

  if (!breeder) {
    return new Response(
      JSON.stringify({ error: 'Breeder no especificado' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  try {
    await client.connect();
    const database = client.db('seedfinder');
    const collection = database.collection('strains');

    // Construir la query con el nombre exacto del breeder
    const query: any = { 
      Breeder: breeder // Usar el nombre exacto del breeder
    };

    if (search) {
      query['Strain Name'] = { $regex: search, $options: 'i' };
    }

    // Obtener el total de documentos para la paginación
    const total = await collection.countDocuments(query);

    // Obtener las cepas con paginación
    const strains = await collection
      .find(query)
      .sort({ 'Strain Name': 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Verificar si se encontraron resultados
    if (strains.length === 0) {
      console.log(`No se encontraron cepas para el breeder: ${breeder}`);
    } else {
      console.log(`Se encontraron ${strains.length} cepas para el breeder: ${breeder}`);
    }

    return new Response(
      JSON.stringify({
        strains,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
          limit
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60' // Cache por 1 minuto
        }
      }
    );
  } catch (error) {
    console.error('Error al obtener cepas:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } finally {
    await client.close();
  }
} 