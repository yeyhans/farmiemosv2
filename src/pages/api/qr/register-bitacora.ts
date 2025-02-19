import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const post: APIRoute = async ({ request }) => {
    try {
        // Obtiene los datos del formulario
        const formData = await request.formData();
        const temperatura = formData.get("temperatura");
        const humedad = formData.get("humedad");
        const vpd = formData.get("vpd");
        const puntoRocio = formData.get("punto_rocio");
        const notas = formData.get("notas");
        const imageAnalyst = formData.get("image_analyst");

        // Construye el objeto de la nueva entrada de bitácora
        const nuevaEntradaBitacora = {
            temperatura,
            humedad,
            vpd,
            punto_rocio: puntoRocio,
            notas,
            image_analyst: imageAnalyst,
            created_at: new Date().toISOString()
        };

        // Supongamos que tienes el ID de la planta (strain_id) en el formulario
        const strainId = formData.get("strain_id");

        if (!strainId) {
            return new Response(JSON.stringify({ error: "ID de la planta no proporcionado" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Obtén el registro actual de la planta
        const { data: strainData, error: fetchError } = await supabase
            .from("strains")
            .select("bitacora")
            .eq("id", strainId)
            .single();

        if (fetchError) {
            return new Response(JSON.stringify({ error: fetchError.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Asegúrate de que el campo `bitacora` sea un array
        const bitacoraActual = Array.isArray(strainData.bitacora) ? strainData.bitacora : [];

        // Agrega la nueva entrada a la bitácora
        const nuevaBitacora = [...bitacoraActual, nuevaEntradaBitacora];

        // Actualiza el campo `bitacora` en la tabla `strains`
        const { error: updateError } = await supabase
            .from("strains")
            .update({ bitacora: nuevaBitacora })
            .eq("id", strainId);

        if (updateError) {
            return new Response(JSON.stringify({ error: updateError.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({
            message: "Bitácora registrada exitosamente",
            redirectUrl: "/bitacoras"
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: "Error en el servidor" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};