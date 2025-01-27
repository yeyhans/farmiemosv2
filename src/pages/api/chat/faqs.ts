import type { APIRoute } from "astro";
import OpenAI from "openai";
import systemContent from "../../../content/patterns/faqs/faqs-prompts.mdx?raw";

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: import.meta.env.DEEPSEEK_API_KEY_FAQS,
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



        // Crear stream de OpenAI
        const stream = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemContent },
                { role: "user", content: userPrompt }
            ],
            temperature: 1.0,
            max_tokens: 500,
            stream: true,  // ← Habilitar streaming
        });

        // Crear ReadableStream
        const encoder = new TextEncoder();
        
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