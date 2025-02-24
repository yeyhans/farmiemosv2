import type { APIRoute } from "astro";
import OpenAI from "openai";
import systemContent from "../../../content/patterns/faqs/faqs-prompts.mdx?raw";
import { MongoClient, ServerApiVersion } from 'mongodb';
import { ipAddress, geolocation } from '@vercel/functions';

const uri = import.meta.env.MONGODB_URI_FAQS;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const openai = new OpenAI({
    apiKey: import.meta.env.OPENAI_API_KEY,
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const userPrompt = formData.get("prompt")?.toString() || "";

        if (!userPrompt) {
            return new Response(JSON.stringify({ error: "Prompt requerido" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Obtener la ip y la geolocalizacion del usuario
        const ip = ipAddress(request);
        const location = geolocation(request);


        // Conectar a la base de datos
        await client.connect();
        const db = client.db("faqs-farmiemos");
        const chats = db.collection("faqs");

        // Crear un nuevo documento para la conversacion
        const chatDoc = {
            timestamp: new Date(),
            userInput: userPrompt,
            aiResponse: "",
            status: "active",
            ip: ip,
            location: location
        };

        // Insertar documento inicial
        const result = await chats.insertOne(chatDoc);
        const chatId = result.insertedId;


        // Crear stream de OpenAI
        const stream = await openai.chat.completions.create({
            model: "ft:gpt-4o-mini-2024-07-18:personal::B4HbwOaI",
            messages: [
                { role: "system", content: systemContent },
                { role: "user", content: userPrompt }
            ],
            temperature: 1.0,
            max_tokens: 1000,
            stream: true,  // ← Habilitar streaming
            functions: [
                {
                    name: "principios_cultivo",
                    description: "Proporciona información sobre los enfoques de cultivo tradicional, super suelo y suelo vivo, y cómo optimizarlos.",
                    parameters: {
                        type: "object",
                        properties: {
                            tipo_cultivo: {
                                type: "string",
                                enum: ["tradicional", "super_suelo", "suelo_vivo"]
                            }
                        },
                        required: ["tipo_cultivo"]
                    }
                },
                {
                    name: "uso_farmienda",
                    description: "Recomienda dosis y formas de aplicar Farmienda según la fase del cultivo y método de aplicación.",
                    parameters: {
                        type: "object",
                        properties: {
                            fase_cultivo: {
                                type: "string",
                                enum: ["clonación", "vegetativo", "floración", "finalización"]
                            },
                            metodo_aplicacion: {
                                type: "string",
                                enum: ["riego", "foliar", "mezcla_sustrato"]
                            },
                            volumen_agua: {
                                type: "number"
                            }
                        },
                        required: ["fase_cultivo", "metodo_aplicacion", "volumen_agua"]
                    }
                },
                {
                    name: "protocolos_riego",
                    description: "Guía para ajustar riego y humedad según el tamaño del contenedor y la escala de humedad.",
                    parameters: {
                        type: "object",
                        properties: {
                            volumen_contenedor: {
                                type: "number"
                            },
                            nivel_humedad: {
                                type: "number"
                            }
                        },
                        required: ["volumen_contenedor", "nivel_humedad"]
                    }
                },
                {
                    name: "diagnostico_problemas",
                    description: "Analiza síntomas o problemas del cultivo para ofrecer soluciones orgánicas.",
                    parameters: {
                        type: "object",
                        properties: {
                            sintomas: {
                                type: "string"
                            },
                            ambiente: {
                                type: "string"
                            },
                            historial_aplicaciones: {
                                type: "string"
                            }
                        },
                        required: ["sintomas", "ambiente", "historial_aplicaciones"]
                    }
                },
                {
                    name: "asesoria_avanzada",
                    description: "Conecta con nosotros para optimizar cultivos comerciales o implementar tecnología agrícola.",
                    parameters: {
                        type: "object",
                        properties: {
                            tipo_servicio: {
                                type: "string",
                                enum: ["asesoria_B2B", "prefactibilidad", "IoT", "IA_aplicada", "instalaciones"]
                            }
                        },
                        required: ["tipo_servicio"]
                    }
                },
                {
                    name: "ventajas_farmienda",
                    description: "Explica las ventajas únicas de Farmienda como producto concentrado y sus beneficios técnicos.",
                    parameters: {
                        type: "object",
                        properties: {
                            aspecto_tecnico: {
                                type: "string",
                                enum: ["micronizacion", "concentracion", "activacion_biologica", "reemplazo_productos"]
                            },
                            formato_consulta: {
                                type: "string",
                                enum: ["general", "comparativo", "tecnico_detallado"]
                            }
                        },
                        required: ["aspecto_tecnico", "formato_consulta"]
                    }
                },

            ]
        });

        // Crear ReadableStream
        const encoder = new TextEncoder();

        let fullResponse = "";
        
        return new Response(
            new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of stream) {
                            const content = chunk.choices[0]?.delta?.content || '';
                            fullResponse += content;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(content)}\n\n`));
                        }
                        controller.close();

                        // Actualizar la conversacion en la base de datos
                        await chats.updateOne(
                            { _id: chatId },
                            { $set: { aiResponse: fullResponse, status: "completed" } }
                        )
                    } catch (error) {
                        console.error('Stream error:', error);
                        // Actualizar el estado de la conversacion a error
                        await chats.updateOne(
                            { _id: chatId },
                            { $set: { status: "error", error: "Error al procesar la solicitud" } }
                        );
                        controller.error(error);
                    } finally {
                        // Cerrar la conexion a la base de datos
                        await client.close();
                    }
                }
            }),
            {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            }
        );

    } catch (error: any) {
        console.error("Error:", error);
        //Asegurar cerrar la conexion a la base de datos
        await client.close();
        return new Response(
            JSON.stringify({ error: "Error interno", details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};


