import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Token verification remains the same...
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado (sin tokens)." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Session setup remains the same...
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    if (sessionError || !sessionData?.user) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado (tokens inválidos)." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await request.formData();

    // Mejorada la validación de números
    const validateNumber = (field: FormDataEntryValue | null): number | null => {
      if (!field) return null;
      const val = field.toString().trim();
      if (val === "") return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    // Validación mejorada de strings
    const validateString = (field: FormDataEntryValue | null): string | null => {
      if (!field) return null;
      const val = field.toString().trim();
      return val === "" ? null : val;
    };

    // Get and validate all fields con mejor manejo
    const notes = validateString(formData.get("notes"));
    const temp = validateNumber(formData.get("temp"));
    const humidity = validateNumber(formData.get("humidity"));
    const vpd = validateNumber(formData.get("vpd"));
    const dewpoint = validateNumber(formData.get("dewpoint"));
    const strainId = validateNumber(formData.get("strain_id"));
    const qrId = validateString(formData.get("qr_id"));

    // Log para debugging
    console.log({
      strainId,
      qrId,
      formData: Object.fromEntries(formData.entries())
    });

    // Validación más específica para cada campo
    if (qrId === null) {
      return new Response(
        JSON.stringify({ success: false, error: "qr_id es requerido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (strainId === null) {
      return new Response(
        JSON.stringify({ success: false, error: "strain_id es requerido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (temp === null || humidity === null || vpd === null || dewpoint === null) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Todos los campos numéricos (temp, humidity, vpd, dewpoint) son requeridos",
          receivedValues: { temp, humidity, vpd, dewpoint }
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // First, get the current bitacora
    const { data: currentStrain, error: fetchError } = await supabase
      .from("strains")
      .select("bitacora")
      .eq("qr_id", qrId)
      .eq("id", strainId)
      .single();

    if (fetchError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: fetchError.message,
        details: { qrId, strainId }
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Prepare the new log entry
    const newLog = {
      timestamp: new Date().toISOString(),
      notes: notes || "",
      temp,
      humidity,
      vpd,
      dewpoint,
    };

    // Create new bitacora array with mejor manejo de tipos
    const currentBitacora = Array.isArray(currentStrain?.bitacora) 
      ? currentStrain.bitacora 
      : [];
    
    const updatedBitacora = [...currentBitacora, newLog];

    // Update the strain record
    const { data: updated, error: updateError } = await supabase
      .from("strains")
      .update({
        bitacora: updatedBitacora
      })
      .eq("qr_id", qrId)
      .eq("id", strainId)
      .select()
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: updateError.message,
        details: { qrId, strainId, bitacoraLength: updatedBitacora.length }
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: updated }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error en POST /api/qr/calculator:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message,
      stack: err.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Token verification remains the same...
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;
    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado (sin tokens)." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Session setup remains the same...
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });
    if (sessionError || !sessionData?.user) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado (tokens inválidos)." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Leer el cuerpo de la solicitud
    const body = await request.json();
    const { qr_id, strain_id, timestamp, notes } = body;
    console.log("Datos recibidos:", { qr_id, strain_id, timestamp, notes });


    // Validar que todos los campos necesarios estén presentes
    if (!qr_id || !strain_id || !timestamp || !notes) {
      return new Response(
        JSON.stringify({ success: false, error: "Faltan campos obligatorios en la solicitud." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Fetch the strain record to find the bitacora
    const { data: strain, error: fetchError } = await supabase
      .from("strains")
      .select("id, qr_id, bitacora")
      .eq("qr_id", qr_id)
      .eq("id", strain_id);
      

      if (fetchError) {
        console.error("Error al obtener la cepa:", fetchError);
      } else if (strain && strain.length > 0) {
        const singleStrain = strain[0];
        console.log("Cepa obtenida:", singleStrain);
      } else {
        console.log("No se encontró ninguna cepa con el qr_id proporcionado.");
      }









    return new Response(JSON.stringify({ success: true, message: "Notas actualizadas exitosamente." }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error en PUT /api/qr/calculator-bitacora:", err);
    return new Response(JSON.stringify({ success: false, error: err.message, stack: err.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Token verification remains the same...
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;
    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado (sin tokens)." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Session setup remains the same...
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      refresh_token: refreshToken,
      access_token: accessToken,
    });
    if (sessionError || !sessionData?.user) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado (tokens inválidos)." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Leer el cuerpo de la solicitud
    const body = await request.json();
    const { qr, id, timestamp } = body;

    // 4. Fetch the strain record to find the bitacora
    const { data: strain, error: fetchError } = await supabase
      .from("strains")
      .select("bitacora")
      .eq("id", id)
      .eq("qr_id", qr)
      .single();

    if (fetchError || !strain?.bitacora) {
      return new Response(JSON.stringify({ success: false, error: "Error al obtener el registro." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. Filtrar el array para eliminar el objeto con el timestamp especificado
    const currentBitacora = Array.isArray(strain.bitacora) ? strain.bitacora : [];
    const updatedBitacora = currentBitacora.filter(entry => entry.timestamp !== timestamp);

    // 6. Update the strain record with the filtered bitacora
    const { error: updateError } = await supabase
      .from("strains")
      .update({ bitacora: updatedBitacora })
      .eq("id", id);

    if (updateError) {
      console.error("Error al actualizar el registro:", updateError);
      return new Response(JSON.stringify({ success: false, error: "Error al actualizar el registro." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Registro eliminado exitosamente." }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error en DELETE /api/qr/calculator-bitacora:", err);
    return new Response(JSON.stringify({ success: false, error: err.message, stack: err.stack }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};