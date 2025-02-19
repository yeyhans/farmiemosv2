import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request }) => {
    try {
      const formData = await request.formData();
      const qr_id = formData.get("qr_id");
      const strain_name = formData.get("strain_name");
      const strain_breeder = formData.get("strain_breeder");
      const strain_fertilizer = formData.get("strain_fertilizer");
      const strain_lighting = formData.get("strain_lighting");
      const strain_space = formData.get("strain_space");
      const strain_suelo = formData.get("strain_suelo");
  
      if (!qr_id || !strain_name) {
        return new Response(JSON.stringify({ error: "Datos incompletos" }), { status: 400 });
      }
  
      const { data, error } = await supabase
        .from("strains")
        .insert({
          qr_id,
          strain_name,
          strain_breeder,
          strain_fertilizer,
          strain_lighting,
          strain_space,
          strain_suelo,
        })
        .select()
        .single();
  
      if (error) throw error;
  
      const newId = data.id;
      const redirectUrl = `/qr/${qr_id}/${newId}`;
  
      // Devolver la URL de redirección como parte de la respuesta JSON
      return new Response(JSON.stringify({ message: "Planta registrada exitosamente", redirectUrl }), { status: 201 });
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  };

export const PUT: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const qr_id = formData.get("qr_id");

    if (!qr_id) {
      return new Response(JSON.stringify({ error: "Se requiere un ID" }), { status: 400 });
    }

    const updates = {
      strain_name: formData.get("strain_name"),
      strain_breeder: formData.get("strain_breeder"),
      strain_fertilizer: formData.get("strain_fertilizer"),
      strain_lighting: formData.get("strain_lighting"),
      strain_space: formData.get("strain_space"),
      strain_suelo: formData.get("strain_suelo"),
    };

    const { data, error } = await supabase.from("strains").update(updates).eq("qr_id", qr_id).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ message: "Planta actualizada exitosamente", strain: data }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
    try {
        const { id, qr_id } = await request.json();

        // Eliminar la fila con el id especificado
        const { error } = await supabase
            .from("strains")
            .delete()
            .eq("id", id)
            .eq("qr_id", qr_id); // Asegurarse de que coincidan ambos valores

        if (error) throw error;

        return new Response(
            JSON.stringify({ message: "Planta eliminada exitosamente" }),
            { status: 200 }
        );
    } catch (error) {
        console.error("Error al eliminar la cepa:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};