// Este archivo centraliza todas las operaciones de base de datos para comunidades
import { connectToDatabase } from '../pages/api/comunidad/mongodb';

// Tipos
export interface Comunidad {
  id?: string;
  nombre: string;
  descripcion: string;
  creador: string;
  creadorId: string;
  creadorImagen?: string;
  miembros?: number;
  fechaCreacion: Date;
  imagen?: string;
}

export interface Post {
  id?: string;
  title: string;
  content: string;
  type: string;
  communityId: string;
  userId: string;
  author: string;
  authorImage?: string;
  plantas?: string[];
  etapaCultivo?: string;
  fuente?: string;
  images?: any[];
  createdAt?: Date;
}

// Funciones para comunidades
export async function getComunidades() {
  const { db } = await connectToDatabase();
  return await db.collection('comunidades').find({}).sort({ fechaCreacion: -1 }).toArray();
}

export async function getComunidadById(id: string) {
  const { db } = await connectToDatabase();
  return await db.collection('comunidades').findOne({ _id: id });
}

export async function crearComunidad(comunidad: Comunidad) {
  const { db } = await connectToDatabase();
  const result = await db.collection('comunidades').insertOne({
    ...comunidad,
    fechaCreacion: new Date(),
    miembros: 1
  });
  return result;
}

// Funciones para posts
export async function getPosts(comunidadId?: string) {
  const { db } = await connectToDatabase();
  const query = comunidadId ? { communityId: comunidadId } : {};
  return await db.collection('posts').find(query).sort({ createdAt: -1 }).toArray();
}

export async function getPostById(id: string) {
  const { db } = await connectToDatabase();
  return await db.collection('posts').findOne({ _id: id });
}

export async function crearPost(post: Post) {
  const { db } = await connectToDatabase();
  const result = await db.collection('posts').insertOne({
    ...post,
    createdAt: new Date()
  });
  return result;
}

// Funciones para comentarios
export async function getComentarios(postId: string) {
  const { db } = await connectToDatabase();
  return await db.collection('comentarios').find({ postId }).sort({ createdAt: -1 }).toArray();
}

export async function crearComentario(comentario: any) {
  const { db } = await connectToDatabase();
  const result = await db.collection('comentarios').insertOne({
    ...comentario,
    createdAt: new Date()
  });
  return result;
} 