// src/utils/farmiemosTools.ts
export async function getProductInfo(args: { product_name: string }) {
    const { product_name } = args;

    // Simulación de una base de datos de productos
    const products = {
        "Farmienda": {
            description: "Producto estrella para activar microbiología del suelo.",
            ingredients: [
                "Ácidos Húmicos", "Ácidos Fúlvicos", "Harina de Rocas Basálticas",
                "Harina de Huesos", "Cenizas de Cereales", "Cebada Malteada Orgánica"
            ],
            usage: "Usar en todo ciclo de vida del cultivo, desde propagación hasta cosecha."
        },
        "Humus de Lombriz": {
            description: "Fertilizante orgánico rico en nutrientes.",
            ingredients: ["Materia Orgánica Descompuesta"],
            usage: "Ideal para cultivos de Suelo Vivo."
        }
    };

    return products[product_name] || { error: "Producto no encontrado." };
}

export async function calculateDosage(args: { product: string; area: number }) {
    const { product, area } = args;

    // Simulación de cálculo de dosis
    const dosages = {
        "Farmienda": 2 * area, // 2g por litro
        "Humus de Lombriz": 0.5 * area // 0.5kg por metro cuadrado
    };

    return dosages[product] || { error: "Producto no reconocido." };
}

export async function getRecommendations(args: { crop_type: string }) {
    const { crop_type } = args;

    // Simulación de recomendaciones basadas en el tipo de cultivo
    const recommendations = {
        "Tomate": "Usa Farmienda en fase de floración (3-5g/L semanal) + PK natural.",
        "Lechuga": "Aplica Humus de Lombriz al inicio y riegos ligeros cada 2 días.",
        "default": "Consulta con nuestro equipo para recomendaciones específicas."
    };

    return recommendations[crop_type] || recommendations["default"];
}