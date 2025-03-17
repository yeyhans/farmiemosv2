import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';

// Configure la clave API desde variables de entorno
const openaiApiKey = process.env.OPENAI_API_KEY;

// Inicializar Supabase para almacenar históricos de consultas y acceder a datos de cultivo
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Sistema de conocimiento base para el asistente
const SYSTEM_PROMPT = `Eres FarmieAI, un asistente especializado en cultivo de plantas, con enfoque particular en cannabis.

CONOCIMIENTOS:
- Experto en todas las etapas de cultivo: germinación, crecimiento vegetativo, floración y cosecha.
- Conocimiento profundo sobre nutrientes, sustratos, sistemas de riego, iluminación, temperatura y humedad.
- Familiaridad con cultivos indoor y outdoor.
- Identificación y solución de problemas comunes: deficiencias nutricionales, plagas, enfermedades, estrés.
- Técnicas de entrenamiento: poda, LST, SCROG, SOG, etc.
- Conocimientos sobre genética y variedades de cannabis.

INSTRUCCIONES:
1. Proporciona información precisa y basada en ciencia.
2. Adapta tus respuestas al nivel de experiencia del usuario.
3. Cuando detectes un problema en el cultivo, solicita imágenes si no han sido proporcionadas.
4. Siempre sugiere soluciones específicas y aplicables.
5. Enfatiza prácticas sostenibles y orgánicas cuando sea posible.
6. Mantén un tono profesional pero accesible.
7. Si no conoces la respuesta, dilo claramente en lugar de especular.
8. Respeta las leyes locales y promueve el cultivo responsable.

Responde de manera concisa y directa, enfocándote en soluciones prácticas.`;

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Método no permitido', { status: 405 });
  }

  try {
    const { messages, userId } = await req.json();

    // Validación de datos de entrada
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Formato de mensajes inválido', { status: 400 });
    }

    // Registrar la consulta en la base de datos (opcional)
    if (userId) {
      await supabase
        .from('cultivo_consultas')
        .insert({
          user_id: userId,
          query: messages[messages.length - 1].content,
          timestamp: new Date().toISOString(),
        });
    }

    // Crear un stream utilizando la nueva API
    const result = streamText({
      model: openai('gpt-4o'),
      system: SYSTEM_PROMPT,
      messages: messages,
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Convertir el AsyncIterable a ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    // Devolver la respuesta en streaming
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error en el asistente de cultivo:', error);
    return new Response('Error interno del servidor', { status: 500 });
  }
} 