import type { APIRoute } from "astro";
import OpenAI from "openai";
import systemContent from "../../../content/patterns/faqs/faqs-prompts.mdx?raw";
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = import.meta.env.MONGODB_URI_FAQS;

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

        // Conectar a la base de datos
        await client.connect();
        const db = client.db("faqs-farmiemos");
        const chats = db.collection("faqs");

        // Crear un nuevo documento para la conversacion
        const chatDoc = {
            timestamp: new Date(),
            userInput: userPrompt,
            aiResponse: "",
            status: "active"
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
        });

        // Crear ReadableStream
        const encoder = new TextEncoder();

        // Actualizar el documento con la respuesta de OpenAI
        await chats.updateOne(
            { _id: chatId },
            { $set: { aiResponse: stream.toString(), status: "completed" } }
        );

        await client.close();
        
        return new Response(
            new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of stream) {
                            const content = chunk.choices[0]?.delta?.content || '';
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(content)}\n\n`));
                        }
                        controller.close();
                    } catch (error) {
                        console.error('Stream error:', error);
                        controller.error(error);
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
        return new Response(
            JSON.stringify({ error: "Error interno", details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};