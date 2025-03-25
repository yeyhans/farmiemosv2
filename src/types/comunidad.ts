export interface Comunidad {
  _id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  creador: string; // ID del usuario que la creó
  moderadores: string[]; // IDs de usuarios moderadores
  fechaCreacion: Date;
  miembros: number;
  reglas: string[];
  slug: string; // URL amigable, ej: "cultivo-indoor"
}

export interface Suscripcion {
  _id: string;
  usuarioId: string;
  comunidadId: string;
  fechaSuscripcion: Date;
  notificaciones: boolean;
}

export type TipoPost = 'consulta' | 'seguimiento' | 'noticia' | 'general';

export interface Post {
  _id: string;
  titulo: string;
  contenido: string;
  tipo: TipoPost;
  comunidadId: string; // Relación con la comunidad
  autorId: string;
  autorNombre: string;
  fechaCreacion: Date;
  votos: number;
  comentarios: number;
  imagenes?: string[];
  // Campos adicionales según el tipo de post
  plantas?: string[]; // Para seguimientos y consultas
  etapaCultivo?: string; // Para seguimientos
  fuente?: string; // Para noticias
  estado?: 'abierto' | 'resuelto'; // Para consultas
} 