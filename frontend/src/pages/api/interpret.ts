export async function POST({ request }) {
    try {
        const datos = await request.json();
        
        // Analizar los datos y generar recomendaciones
        let interpretacion = '<div class="space-y-4">';
        
        // Interpretar temperatura
        interpretacion += '<div class="mb-2">';
        if (datos.temp < 20) {
            interpretacion += `
                <p class="text-blue-600 font-medium">🌡️ Temperatura Baja (${datos.temp}°C)</p>
                <ul class="list-disc ml-4 text-sm">
                    <li>Considere aumentar la temperatura para optimizar el crecimiento</li>
                    <li>Revise el sistema de calefacción</li>
                    <li>Puede afectar la absorción de nutrientes</li>
                </ul>
            `;
        } else if (datos.temp > 30) {
            interpretacion += `
                <p class="text-red-600 font-medium">🌡️ Temperatura Alta (${datos.temp}°C)</p>
                <ul class="list-disc ml-4 text-sm">
                    <li>Mejore la ventilación</li>
                    <li>Considere usar sistemas de enfriamiento</li>
                    <li>Monitoree el estrés de las plantas</li>
                </ul>
            `;
        } else {
            interpretacion += `
                <p class="text-green-600 font-medium">🌡️ Temperatura Óptima (${datos.temp}°C)</p>
                <ul class="list-disc ml-4 text-sm">
                    <li>Mantiene buenas condiciones para la fotosíntesis</li>
                    <li>Favorable para el desarrollo de la planta</li>
                </ul>
            `;
        }
        interpretacion += '</div>';

        // Interpretar humedad
        interpretacion += '<div class="mb-2">';
        if (datos.humidity < 40) {
            interpretacion += `
                <p class="text-red-600 font-medium">💧 Humedad Baja (${datos.humidity}%)</p>
                <ul class="list-disc ml-4 text-sm">
                    <li>Use humidificadores</li>
                    <li>Revise la ventilación</li>
                    <li>Considere reducir la temperatura</li>
                </ul>
            `;
        } else if (datos.humidity > 70) {
            interpretacion += `
                <p class="text-red-600 font-medium">💧 Humedad Alta (${datos.humidity}%)</p>
                <ul class="list-disc ml-4 text-sm">
                    <li>Mejore la circulación de aire</li>
                    <li>Considere usar deshumidificadores</li>
                    <li>Vigile signos de hongos o moho</li>
                </ul>
            `;
        } else {
            interpretacion += `
                <p class="text-green-600 font-medium">💧 Humedad Óptima (${datos.humidity}%)</p>
                <ul class="list-disc ml-4 text-sm">
                    <li>Mantiene un buen balance hídrico</li>
                    <li>Favorable para la transpiración</li>
                </ul>
            `;
        }
        interpretacion += '</div>';

        // Interpretar VPD
        interpretacion += '<div class="mb-2">';
        if (datos.vpd < 0.8) {
            interpretacion += `
                <p class="text-yellow-600 font-medium">💨 VPD Bajo (${datos.vpd} kPa)</p>
                <ul class="list-disc ml-4 text-sm">
                    <li>Riesgo de condensación</li>
                    <li>Posible desarrollo de hongos</li>
                    <li>Considere reducir la humedad o aumentar temperatura</li>
                </ul>
            `;
        } else if (datos.vpd > 1.2) {
            interpretacion += `
                <p class="text-yellow-600 font-medium">💨 VPD Alto (${datos.vpd} kPa)</p>
                <ul class="list-disc ml-4 text-sm">
                    <li>Posible estrés hídrico</li>
                    <li>Aumente la humedad o reduzca temperatura</li>
                    <li>Monitoree el riego</li>
                </ul>
            `;
        } else {
            interpretacion += `
                <p class="text-green-600 font-medium">💨 VPD Óptimo (${datos.vpd} kPa)</p>
                <ul class="list-disc ml-4 text-sm">
                    <li>Excelente para la fotosíntesis</li>
                    <li>Balance ideal de transpiración</li>
                </ul>
            `;
        }
        interpretacion += '</div>';
        
        interpretacion += '</div>';

        return new Response(JSON.stringify({
            success: true,
            interpretacion
        }), {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}