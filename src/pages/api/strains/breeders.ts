import type { APIRoute } from 'astro';
import { MongoClient } from 'mongodb';

export const GET: APIRoute = async () => {
  const client = new MongoClient(import.meta.env.MONGODB_URI_SEEDFINDER);

  try {
    await client.connect();
    const database = client.db('seedfinder');
    const collection = database.collection('strains');

    // Agregación para obtener breeders y su conteo de cepas
    const breeders = await collection.aggregate([
      {
        $group: {
          _id: '$Breeder',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          breeder: { $ifNull: ['$_id', 'Desconocido'] },
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { breeder: 1 }
      }
    ]).toArray();

    return new Response(JSON.stringify(breeders), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error al obtener breeders:', error);
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