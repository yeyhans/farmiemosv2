import { useEffect } from 'react';

interface Props {
  amount: number;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function MercadoPagoButton({ amount }: Props) {
  useEffect(() => {
    // Agregar el script de MercadoPago si no existe
    const script = document.createElement('script');
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.type = "text/javascript";
    document.body.appendChild(script);

    script.onload = () => {
      console.log('Script de MercadoPago cargado correctamente');
      loadMercadoPago();
    };

    const loadMercadoPago = async () => {
      try {
        if (!window.MercadoPago) {
          throw new Error('MercadoPago SDK no está disponible');
        }

        const mp = new window.MercadoPago(import.meta.env.PUBLIC_MERCADOPAGO_PUBLIC_KEY, {
          locale: 'es-CL'
        });

        console.log('MercadoPago inicializado con monto:', amount);

        await mp.bricks().create("cardPayment", "cardPayment_container", {
          initialization: {
            amount: amount
          },
          callbacks: {
            onReady: () => {
              console.log('Card Payment Brick listo');
            },
            onSubmit: async (cardFormData: any) => {
              try {
                const paymentData = {
                  ...cardFormData,
                  transaction_amount: amount
                };
                
                const response = await fetch('/api/mercadopago/farmienda', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(paymentData)
                });

                const result = await response.json();
                
                if (response.ok && result.status === 'success') {
                  // Guardar el monto en localStorage antes de redirigir
                  localStorage.setItem('transactionAmount', amount.toString());
                  // Redirigir a la página de éxito
                  window.location.href = `/pago-exitoso?payment_id=${result.data.id}`;
                } else {
                  // Redirigir a la página de error
                  window.location.href = `/pago-fallido?error=${encodeURIComponent(result.message)}`;
                }
                
              } catch (error) {
                console.error('Error procesando el pago:', error);
                window.location.href = `/pago-fallido?error=${encodeURIComponent('Error en el proceso de pago')}`;
              }
            },
            onError: (error: any) => {
              console.error('Error en Card Payment:', error);
              // Mostrar detalles específicos del error
              if (error.message) {
                console.error('Mensaje de error:', error.message);
              }
              if (error.cause) {
                console.error('Causa del error:', error.cause);
              }
            },
            onBinChange: (bin: string) => {
              console.log('Primeros 6 dígitos de la tarjeta:', bin);
            },
            onFetching: (resource: string) => {
              console.log('Fetching recurso:', resource);
            }
          },
          style: {
            theme: 'default'
          }
        });
      } catch (error) {
        console.error('Error al inicializar MercadoPago:', error);
        if (error instanceof Error) {
          console.error('Mensaje de error:', error.message);
        }
      }
    };

    return () => {
      // Limpieza del script cuando el componente se desmonte
      document.body.removeChild(script);
    };
  }, [amount]);

  return (
    <div 
      id="cardPayment_container" 
      style={{
        minHeight: '200px',
        width: '100%',
        margin: '10px 0'
      }}
    ></div>
  );
} 