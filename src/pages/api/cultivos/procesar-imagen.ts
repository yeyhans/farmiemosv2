import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Configure la clave API desde variables de entorno
const openaiApiKey = process.env.OPENAI_API_KEY;

export const config = {
  runtime: 'edge',
};

// Función para crear un ReadableStream a partir de un AsyncIterable
function createReadableStreamFromAsyncIterable(asyncIterable: AsyncIterable<string>) {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of asyncIterable) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Método no permitido', { status: 405 });
  }

  try {
    const { imageUrl, prompt } = await req.json();

    // Validación de datos de entrada
    if (!imageUrl) {
      return new Response('URL de imagen requerida', { status: 400 });
    }

    // Sistema de conocimiento base para el análisis de imágenes
    const systemPrompt = `Eres un experto en análisis de cultivos, especialmente de cannabis. 
Tu tarea es analizar imágenes de plantas e identificar:
1. Estado de salud general de la planta
2. Posibles deficiencias nutricionales
3. Signos de plagas o enfermedades
4. Recomendaciones específicas para mejorar el cultivo
5. Fase de crecimiento actual

Proporciona información precisa, científica y procesable. Si no puedes identificar con certeza algún problema, indícalo claramente.
Responde de manera estructurada, concisa y práctica.`;

    const userPrompt = prompt || 'Analiza esta imagen de mi cultivo e identifica posibles problemas o mejoras.';

    // Preparar los datos para la llamada a la API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    // Devolver la respuesta en streaming
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error al procesar imagen de cultivo:', error);
    return new Response('Error interno del servidor', { status: 500 });
  }
} 