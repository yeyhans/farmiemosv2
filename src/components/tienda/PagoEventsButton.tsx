import { useEffect, useState } from 'react';

interface Props {
  amount: number;
  eventDay?: string;
  description?: string;
  fecha_event?: string;
  referee?: string;
  isSoldOut?: boolean;
  attendees: Attendee[];
}

interface Attendee {
  name: string;
  phone: string;
  instagram: string;
}

interface EventDetails {
  eventDay: string;
  description: string;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function MercadoPagoButton({ amount, eventDay = '', description = '', fecha_event = '', referee = '', isSoldOut = false, attendees = [] }: Props) {
  const [currentAmount, setCurrentAmount] = useState(amount);
  const [eventDetails, setEventDetails] = useState({
    eventDay: eventDay || '',
    description: description || ''
  });
  const [eventData, setEventData] = useState<any>({});
  const [quantity, setQuantity] = useState(1);
  const [formErrors, setFormErrors] = useState<{[key: string]: boolean}>({});

  // Update validateForm to work with props instead of state
  const validateForm = (): boolean => {
    let isValid = true;

    attendees.forEach((attendee) => {
      if (!attendee.name.trim() || !attendee.phone.trim()) {
        isValid = false;
      }
    });

    return isValid;
  };
  
  useEffect(() => {
    // Initialize eventDetails from props
    setEventDetails({
      eventDay: eventDay || '',
      description: description || ''
    });
    
    // Initialize eventData with props data
    setEventData({
      ...eventData,
      eventDay: eventDay,
      description: description,
      fecha_event: fecha_event,
      referee: referee,
      attendees: attendees
    });

    // Listen for amount update events from the page
    const handleUpdateAmount = (event: CustomEvent) => {
      const { amount: newAmount, eventDay, description, eventData: newEventData } = event.detail;
      console.log('Updating amount from event:', newAmount);
      console.log('Event details:', eventDay, description);
      setCurrentAmount(newAmount);
      setEventDetails({
        eventDay: eventDay || '',
        description: description || ''
      });
      if (newEventData) {
        // Preserve attendees data if it exists in the current state
        setEventData({
          ...newEventData,
          attendees: newEventData.attendees || attendees
        });
        // Update quantity based on event data
        if (newEventData.quantity && newEventData.quantity !== quantity) {
          setQuantity(newEventData.quantity);
        }
      }
    };

    // Add event listener for updating event data separately
    const handleUpdateEventData = (event: CustomEvent) => {
      if (event.detail.eventData) {
        console.log('Updating event data:', event.detail.eventData);
        // Merge the new event data with existing data
        setEventData(prevData => ({
          ...prevData,
          ...event.detail.eventData,
          // Ensure we don't lose the event details
          eventDay: eventDay || prevData.eventDay,
          description: description || prevData.description,
          fecha_event: fecha_event || prevData.fecha_event,
          referee: referee || prevData.referee
        }));
      }
    };

    // Add event listeners
    window.addEventListener('updateAmount', handleUpdateAmount as EventListener);
    window.addEventListener('updateEventData', handleUpdateEventData as EventListener);

    // Clean up listeners when component unmounts
    return () => {
      window.removeEventListener('updateAmount', handleUpdateAmount as EventListener);
      window.removeEventListener('updateEventData', handleUpdateEventData as EventListener);
    };
  }, [quantity, eventDay, description, fecha_event, referee, attendees]);

  useEffect(() => {
    // Update currentAmount when the amount prop changes
    setCurrentAmount(amount);
  }, [amount]);

  useEffect(() => {
    // Add MercadoPago script if it doesn't exist
    const script = document.createElement('script');
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.type = "text/javascript";
    
    // Check if script already exists
    if (!document.querySelector(`script[src="${script.src}"]`)) {
      document.body.appendChild(script);
    }

    let mpInstance: any = null;
    let cardPaymentBrickRef: any = null;
    let isInitializing = false;

    const loadMercadoPago = async () => {
      try {
        if (!window.MercadoPago) {
          console.log('Waiting for MercadoPago SDK to load...');
          setTimeout(loadMercadoPago, 500);
          return;
        }

        // Prevent multiple initializations running at the same time
        if (isInitializing) return;
        isInitializing = true;

        // Properly clear container before creating a new Brick
        const container = document.getElementById('cardPayment_container');
        if (container) {
          // Completely reset the container to avoid DOM manipulation conflicts
          container.innerHTML = '';
        }

        // Create a fresh container if needed
        if (!document.getElementById('cardPayment_container')) {
          console.error('Payment container not found');
          isInitializing = false;
          return;
        }

        mpInstance = new window.MercadoPago(import.meta.env.PUBLIC_MERCADOPAGO_KEY, {
          locale: 'es-CL'
        });

        console.log('MercadoPago initialized with amount:', currentAmount);

        // Make sure any previous instance is unmounted first
        if (cardPaymentBrickRef) {
          try {
            await cardPaymentBrickRef.unmount();
          } catch (e) {
            console.warn('Error unmounting previous Brick instance:', e);
          }
          cardPaymentBrickRef = null;
        }

        // Create the new Brick instance
        cardPaymentBrickRef = await mpInstance.bricks().create("cardPayment", "cardPayment_container", {
          initialization: {
            amount: currentAmount,
          },
          callbacks: {
            onReady: () => {
              console.log('Card Payment Brick ready');
            },
            onSubmit: async (cardFormData: any) => {
              try {
                // Validate attendee information before proceeding
                if (!validateForm()) {
                  alert('Por favor complete todos los campos obligatorios de los asistentes.');
                  return;
                }
                
                // Get updated attendees from props or local storage as backup
                const currentAttendees = attendees.length > 0 ? 
                  attendees : 
                  (eventData.attendees || JSON.parse(localStorage.getItem('eventData') || '{}').attendees || []);
                
                // Make sure we're capturing all relevant event data
                const updatedEventData = {
                  ...eventData,
                  eventDay: eventDay || eventData.eventDay || '',
                  description: description || eventData.description || '',
                  fecha_event: fecha_event || eventData.fecha_event || '',
                  referee: referee || eventData.referee || '',
                  attendees: currentAttendees.map(att => ({
                    name: att.name,
                    phone: att.phone,
                    instagram: att.instagram || ''
                  })),
                  quantity: quantity,
                  totalAmount: currentAmount
                };
                
                // Log the event data to verify its structure
                console.log('Event data being saved:', JSON.stringify(updatedEventData));
                
                // Update localStorage with the new data
                localStorage.setItem('eventData', JSON.stringify(updatedEventData));
                
                console.log('Final event data for payment:', JSON.stringify(updatedEventData));
                
                const paymentData = {
                  ...cardFormData,
                  transaction_amount: currentAmount,
                  eventData: updatedEventData
                };
                
                // Debugging log to see what's being sent to API
                console.log('Sending to API:', JSON.stringify(paymentData));
                
                const response = await fetch('/api/mercadopago/eventos', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(paymentData)
                });

                const result = await response.json();
                
                if (response.ok && result.status === 'success') {
                  // Save transaction info before redirecting
                  localStorage.setItem('transactionAmount', currentAmount.toString());
                  localStorage.setItem('paymentId', result.data.id);
                  // Redirect to success page
                  window.location.href = `/pago-exitoso?payment_id=${result.data.id}&type=event`;
                } else {
                  // Redirect to error page
                  window.location.href = `/pago-fallido?error=${encodeURIComponent(result.message)}`;
                }
                
              } catch (error) {
                console.error('Error processing payment:', error);
                window.location.href = `/pago-fallido?error=${encodeURIComponent('Error in payment process')}`;
              }
            },
            onError: (error: any) => {
              console.error('Error in Card Payment:', error);
              if (error.message) {
                console.error('Error message:', error.message);
              }
              if (error.cause) {
                console.error('Error cause:', error.cause);
              }
            },
            onBinChange: (bin: string) => {
              console.log('First 6 digits:', bin);
            },
            onFetching: (resource: string) => {
              console.log('Fetching resource:', resource);
            }
          },
          style: {
            theme: 'default'
          }
        });
      } catch (error) {
        console.error('Error initializing MercadoPago:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
        }
      }
    };

    // If script is already loaded, initialize MercadoPago
    if (window.MercadoPago) {
      loadMercadoPago();
    } else {
      // Otherwise, wait for script to load
      script.onload = loadMercadoPago;
    }

    return () => {
      // Specific cleanup for MercadoPago Brick
      if (cardPaymentBrickRef) {
        try {
          cardPaymentBrickRef.unmount();
        } catch (e) {
          console.error('Error unmounting Brick:', e);
        }
      }
    };
  }, [currentAmount, eventData, attendees, quantity]);

  return (
    <div className="space-y-6">
      {/* MercadoPago button */}
      <div 
        id="cardPayment_container" 
        style={{
          minHeight: '200px',
          width: '100%',
          margin: '10px 0'
        }}
      ></div>
    </div>
  );
}