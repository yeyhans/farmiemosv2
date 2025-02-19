import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: import.meta.env.OPENAI_API_KEY,
});

// Función helper para respuestas de error
const createErrorResponse = (
    message: string,
    status: number,
    details?: any
): Response => {
    console.error(`[${status}] ${message}`, details);
    return new Response(
        JSON.stringify({
            success: false,
            error: message,
            ...(import.meta.env.DEV && { details }),
        }),
        {
            status,
            headers: { "Content-Type": "application/json" },
        }
    );
};

export const POST: APIRoute = async ({ cookies }) => {
    try {
        // 1. Verificación de tokens
        const accessToken = cookies.get("sb-access-token")?.value;
        const refreshToken = cookies.get("sb-refresh-token")?.value;
        
        if (!accessToken || !refreshToken) {
            return createErrorResponse("No autorizado - Tokens faltantes", 401);
        }

        // 2. Autenticación con Supabase
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            refresh_token: refreshToken,
            access_token: accessToken,
        });

        if (sessionError || !sessionData?.user) {
            return createErrorResponse(
                "No autorizado - Sesión inválida",
                401,
                sessionError
            );
        }

        // 3. Obtener perfil del usuario
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", sessionData.user.id)
            .single();

        if (profileError) {
            return createErrorResponse(
                "Error al obtener el perfil",
                500,
                profileError
            );
        }

        // 4. Construcción del prompt
        const buildProfileString = (): string => {
            const fields = {
                "Nombre de usuario": profile.instagram,
                "Nivel de experiencia": profile.experience_level,
                "Cultivo principal": profile.cultivo_principal,
                "Escala de cultivo": profile.escala_cultivo,
                Motivación: profile.motivacion,
                "Tamaño del espacio": profile.tamano_espacio,
                Comuna: profile.comuna,
                "Tipo de suelo": profile.tipo_suelo,
                Iluminación: profile.tipo_iluminacion,
                Riego: profile.fuente_riego,
                Fertilización: profile.fertilizacion,
                "Control de plagas": profile.control_plagas,
                "Frecuencia de riego": profile.frecuencia_riego,
                Problemas: profile.problemas_enfrentados,
                Objetivos: profile.objetivos_mejora,
                Tecnología: profile.interes_tecnologia,
            };

            return Object.entries(fields)
                .map(([key, value]) => `${key}: ${value ?? 'No especificado'}`)
                .join("\n");
        };

        const systemContent = `Eres un experto en describir el perfil de usuarios agricolas. Describelo en detalle con 500 caracteres o menos.`;
        
        const userContent = `Utiliza 500 caracteres o menos. Genera una descripción detallada y concisa del perfil usando esta información:\n${buildProfileString()}`;
        
        // 5. Llamada a OpenAI
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemContent },
                    { role: "user", content: userContent },
                ],
                temperature: 0.5, // Reducido para mayor cohesión
                max_tokens: 300, // Ajustado para limitar extensión
                presence_penalty: 0.5 // Ayuda a mantener la unidad temática
            });

            if (!response.choices?.[0]?.message) {
                throw new Error("Estructura de respuesta inválida de OpenAI");
            }

            // 6. Retornar respuesta
            const generatedProfile = response.choices[0].message.content;
            console.log("Respuesta recibida de OpenAI para:", generatedProfile); 

            // Actualizar perfil en la base de datos
            const { error: updateError } = await supabase
                .from("profiles")
                .update({ prompt_profile: generatedProfile })
                .eq("user_id", sessionData.user.id);

            if (updateError) {
                throw new Error(`Error al guardar en BD: ${updateError.message}`);
            }

            console.log("Perfil generado exitosamente para:", profile.user_name);
            return new Response(
                JSON.stringify(response.choices[0].message),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido";
            console.error("Error en OpenAI:", {
                error: errorMessage,
                profileId: sessionData.user.id,
                model: "gpt-4o"
            });
            return createErrorResponse("Error al generar el perfil", 500, errorMessage);
        }

    } catch (error) {
        return createErrorResponse("Error interno del servidor", 500, error);
    }
};