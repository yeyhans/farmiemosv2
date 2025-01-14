import { MercadoPagoConfig, Payment } from 'mercadopago';

// Inicializa el cliente de Mercado Pago con tu access_token
const mercadopagoClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN, // Utiliza las credenciales desde las variables de entorno
});

export const mercadopago = new Payment(mercadopagoClient);
