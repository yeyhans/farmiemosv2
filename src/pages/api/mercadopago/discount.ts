import type { APIRoute } from 'astro';

// Definir interface para el cupón
interface Coupon {
    code: string;
    discount: number;
    validUntil: Date;
}

// Lista de cupones válidos (en producción esto debería estar en una base de datos)
const validCoupons: Coupon[] = [
    {
        code: 'CHOCOFARM',
        discount: 20, // 10% de descuento
        validUntil: new Date('2025-12-31')
    },
    {
        code: 'MARZO20',
        discount: 20, // 20% de descuento
        validUntil: new Date('2025-03-31')
    }
];

export const POST: APIRoute = async ({ request }) => {
    try {
        const { code, amount } = await request.json();

        // Validar que se recibieron los datos necesarios
        if (!code || !amount) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Código y monto son requeridos'
                }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        // Buscar el cupón
        const coupon = validCoupons.find(
            c => c.code.toLowerCase() === code.toLowerCase() && 
            new Date() <= c.validUntil
        );

        // Si no se encuentra el cupón o está vencido
        if (!coupon) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Cupón inválido o vencido'
                }),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        // Calcular el descuento
        const discountAmount = (amount * coupon.discount) / 100;
        const finalAmount = amount - discountAmount;

        return new Response(
            JSON.stringify({
                success: true,
                discount: coupon.discount,
                originalAmount: amount,
                discountAmount: discountAmount,
                finalAmount: finalAmount
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

    } catch (error) {
        console.error('Error al procesar el descuento:', error);
        return new Response(
            JSON.stringify({
                success: false,
                message: 'Error al procesar el descuento'
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
};
