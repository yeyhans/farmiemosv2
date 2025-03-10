import { useEffect, useState } from 'react';

interface Props {
  amount: number;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function MercadoPagoButton({ amount }: Props) {
  const [currentAmount, setCurrentAmount] = useState(amount);
  
  useEffect(() => {
    // Escuchar el evento de actualización de monto
    const handleUpdateAmount = (event: CustomEvent) => {
      const { amount: newAmount } = event.detail;
      console.log('Actualizando monto desde evento:', newAmount);
      setCurrentAmount(newAmount);
    };

    // Añadir el listener de eventos
    window.addEventListener('updateAmount', handleUpdateAmount as EventListener);

    // Limpiar el listener cuando el componente se desmonte
    return () => {
      window.removeEventListener('updateAmount', handleUpdateAmount as EventListener);
    };
  }, []);

  useEffect(() => {
    // Agregar el script de MercadoPago si no existe
    const script = document.createElement('script');
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.type = "text/javascript";
    
    // Verificar si el script ya existe
    if (!document.querySelector(`script[src="${script.src}"]`)) {
      document.body.appendChild(script);
    }

    let mpInstance: any = null;
    let cardPaymentBrickRef: any = null;

    const loadMercadoPago = async () => {
      try {
        if (!window.MercadoPago) {
          throw new Error('MercadoPago SDK no está disponible');
        }

        // Limpiar el contenedor antes de crear un nuevo Brick
        const container = document.getElementById('cardPayment_container');
        if (container) {
          container.innerHTML = '';
        }

        mpInstance = new window.MercadoPago(import.meta.env.PUBLIC_MERCADOPAGO_KEY, {
          locale: 'es-CL'
        });

        console.log('MercadoPago inicializado con monto:', currentAmount);

        cardPaymentBrickRef = await mpInstance.bricks().create("cardPayment", "cardPayment_container", {
          initialization: {
            amount: currentAmount
          },
          callbacks: {
            onReady: () => {
              console.log('Card Payment Brick listo');
            },
            onSubmit: async (cardFormData: any) => {
              try {
                const paymentData = {
                  ...cardFormData,
                  transaction_amount: currentAmount
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
                  localStorage.setItem('transactionAmount', currentAmount.toString());
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

    // Si el script ya está cargado, inicializar MercadoPago
    if (window.MercadoPago) {
      loadMercadoPago();
    } else {
      // Si no, esperar a que el script se cargue
      script.onload = loadMercadoPago;
    }

    return () => {
      // Cleanup específico para el Brick de MercadoPago
      if (cardPaymentBrickRef) {
        try {
          cardPaymentBrickRef.unmount();
        } catch (e) {
          console.error('Error al desmontar el Brick:', e);
        }
      }
    };
  }, [currentAmount]); // Dependencia en currentAmount para recrear el componente cuando cambia

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