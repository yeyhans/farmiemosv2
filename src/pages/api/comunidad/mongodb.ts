import { MongoClient } from 'mongodb';

// Asegurar que MONGODB_URI existe
const MONGODB_URI = import.meta.env.MONGODB_URI_COMMUNITY;

if (!MONGODB_URI) {
  throw new Error('Por favor, define la variable de entorno MONGODB_URI');
}

const uri = import.meta.env.MONGODB_URI_COMMUNITY;
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // En desarrollo, usamos una variable global para preservar la conexión entre recargas HMR
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // En producción, es mejor no usar una variable global
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function connectToDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db('farmiemos'); // Asegúrate de poner el nombre correcto de tu base de datos
    
    console.log('MongoDB conectado correctamente');
    return { db, client };
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    throw new Error('No se pudo conectar a la base de datos MongoDB');
  }
}

export async function getPost(postId: string) {
  try {
    await client.connect();
    const database = client.db('your_database_name');
    const posts = database.collection('posts');
    
    return await posts.findOne({ _id: new ObjectId(postId) });
  } finally {
    await client.close();
  }
} 