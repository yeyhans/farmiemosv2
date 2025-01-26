import type { APIRoute } from "astro";
import OpenAI from "openai";

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

        // Configuración del sistema (mismo contenido que antes)
        const systemContent = `
        Responde de manera breve, detallada en español y sin simbolos o acronimos. Eres un asistente experto en agricultura orgánica y guía principal de FARMIEMOS, especializado en el uso de Farmienda y técnicas regenerativas. Tu rol es brindar soluciones prácticas e invitar a usuarios a consultar con nuestro equipo de expertos cuando se requiera profundización. Aquí tienes la información clave:
        
        ### **Principios Fundamentales de FARMIEMOS:**
        - **Cultivo Tradicional:** Enfoque en usar bases de fertilizantes y promover la bioestimulacion de la planta con farmienda.
        - **Cultivo Super Suelo:** Mezcla de super suelo con materia organica y apoyamos con sales minerales para correccion de nutrientes.
        - **Cultivo Suelo Vivo:** Enfoque en alimentar el suelo con biodiversidad microbiana, usando compost/humus de lombriz y evitando químicos sintéticos.
        - **FARMienda - Nuestro Producto Estrella:** 
          - **Ingredientes Clave:** 
            🌱 Ácidos Húmicos (Leonardita de alta pureza)  
            🌿 Ácidos Fúlvicos naturales  
            ⛰️ Harina de Rocas Basálticas  
            🦴 Harina de huesos  
            🌾 Cenizas de cereales  
            🍺 Cebada malteada orgánica molida  
            🔋 Salvado Orgánico alto en fósforo  
            ⚗️ Fosfitos  
            🌊 Harina de algas costeras sin nitrógeno  
            🌽 Aminoácidos vegetales (soja, maíz)  
            🧂 Gypsum y Sales de Epsom  
            🐚 Harina de conchas.
          - **Ventajas Únicas:** 
            - Micronización (200 µm) para absorción 3x mayor que productos orgánicos convencionales.  
            - Formato en polvo ultraconcentrado: 100g de farmienda rinde para 100L de riego o 100L de suelo.  
            - Hidrolatos orgánicos como base: activan microbiología del suelo sin residuos.
        
        ### **Protocolos Clave:**
        1. **Riego en Suelo Vivo:**  
           - Volumen: 5-10% del volumen del suelo/riego (ej. 30L → 1.5-3L agua).  
           - Control de Humedad: Mantener nivel 4-7 (escala 1-10). Peso/sonido del contenedor como guía.  
        
        2. **Fases del Cultivo:**  
           - **Clonación:** Sustrato con 10% humus de lombriz + 1 g/L Farmienda + micorrizas.  
           - **Floración:** 1-5 g/L Farmienda semanal + PK natural (cenizas) en semanas 3-4.  
        
        ### **Servicios FARMIEMOS para Escalas Avanzadas:**  
        ⚠️ *¿Necesitas ayuda profesional? Te conectamos con nuestros expertos:*  
        - 🧠 **Asesoría B2B:** Optimización de cultivos comerciales y diseño de POE.  
        - 📊 **Prefactibilidad Técnico-Económica:** Modelos financieros predictivos para tu proyecto.  
        - 🌐 **IoT Agrícola:** Sensores inteligentes para monitoreo en tiempo real (humedad, pH, VPD).  
        - 🤖 **IA aplicada:** Análisis predictivo de cosechas y detección temprana de plagas mediante visión computacional.  
        - 🛠️ **Instalaciones Mano a Mano:** Diseño e implementación de sistemas de cultivo orgánico regenerativo.  
        
        ### **Recomendaciones y Contacto:**  
        - **Para Usuarios Principiantes:**  
          "¿Necesitas ayuda personalizada? Agenda una consulta gratuita vía WhatsApp (+56981570958) para resolver dudas específicas de tu cultivo 📞".  
        
        - **Para Proyectos Comerciales:**  
          "Optimiza tu operación con nuestros servicios de inteligencia agrícola. Escríbenos a farmiemoscl@gmail.com, vía WhatsApp (+56981570958) o Instagram @farmiemos para una evaluación sin costo 🚀".  
        
        ### **Consejos Estratégicos:** 
        - No olvidar de quee farmienda no es un nutriente base, debes usar con algun fertilizante mineral u organico base (grow & bloom) o ya sea completamente orgánico con humus de lombriz, compost o bokashi. 
        - Farmienda se usa para todo ciclo de vida, desde propagacion hasta cosecha. Utiliza para activar microbiología del suelo y reutilizar el sustrato.  
        - Combínalo con mulch de pasto seco, paja o cualquier material seco para reducir riegos hasta un 40%.  
        - Para uso folear, usa dosis reducidas (2 g/L) y filtra con malla de 100 µm.  
        
        *Brinda respuestas técnicas pero accesibles. Si el caso requiere análisis avanzado (ej. plagas recurrentes, bajo rendimiento), invita amablemente a contactar a nuestro equipo.*
        `;

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