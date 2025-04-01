import type { APIRoute } from 'astro';
import { MongoClient, ObjectId } from 'mongodb';

export const GET: APIRoute = async ({ params }) => {
  const client = new MongoClient(import.meta.env.MONGODB_URI_SEEDFINDER);

  try {
    // Validar que el _id sea un ObjectId válido
    if (!params._id || typeof params._id !== 'string') {
      return new Response(JSON.stringify({ error: 'ID inválido' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(params._id);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'ID inválido' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    await client.connect();
    const database = client.db('seedfinder');
    const collection = database.collection('strains');

    const strain = await collection.findOne({ _id: objectId });

    if (!strain) {
      return new Response(JSON.stringify({ error: 'Cepa no encontrada' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify(strain), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache por 5 minutos
      }
    });
  } catch (error) {
    console.error('Error al obtener cepa:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } finally {
    await client.close();
  }
} 