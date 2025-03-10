import { useEffect, useState } from 'react';
import AttendeeForm from './AttendeeForm';

interface Props {
  amount: number;
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

export default function MercadoPagoButton({ amount }: Props) {
  const [currentAmount, setCurrentAmount] = useState(amount);
  const [eventDetails, setEventDetails] = useState({
    eventDay: '',
    description: ''
  });
  const [eventData, setEventData] = useState<any>({});
  const [quantity, setQuantity] = useState(1);
  const [attendees, setAttendees] = useState<Attendee[]>([{ name: '', phone: '', instagram: '' }]);
  const [formErrors, setFormErrors] = useState<{[key: string]: boolean}>({});
  const [isFormComplete, setIsFormComplete] = useState(false);

  // Handle attendee field changes
  const handleAttendeeChange = (index: number, field: keyof Attendee, value: string) => {
    const newAttendees = [...attendees];
    newAttendees[index] = { ...newAttendees[index], [field]: value };
    setAttendees(newAttendees);
    
    // Clear error for this field if it was previously marked as error
    if (formErrors[`${field}-${index}`]) {
      const newErrors = { ...formErrors };
      delete newErrors[`${field}-${index}`];
      setFormErrors(newErrors);
    }
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: boolean} = {};
    let isValid = true;

    attendees.forEach((attendee, index) => {
      if (!attendee.name.trim()) {
        newErrors[`name-${index}`] = true;
        isValid = false;
      }
      if (!attendee.phone.trim()) {
        newErrors[`phone-${index}`] = true;
        isValid = false;
      }
    });

    setFormErrors(newErrors);
    setIsFormComplete(isValid);
    return isValid;
  };
  
  // Check form completeness whenever attendees change
  useEffect(() => {
    validateForm();
  }, [attendees]);
  
  useEffect(() => {
    // Listen for amount update events from the page
    const handleUpdateAmount = (event: CustomEvent) => {
      const { amount: newAmount, eventDay, description, eventData } = event.detail;
      console.log('Updating amount from event:', newAmount);
      console.log('Event details:', eventDay, description);
      setCurrentAmount(newAmount);
      setEventDetails({
        eventDay: eventDay || '',
        description: description || ''
      });
      if (eventData) {
        setEventData(eventData);
        // Update quantity and attendees based on event data
        if (eventData.quantity && eventData.quantity !== quantity) {
          setQuantity(eventData.quantity);
          // Create new array with the correct number of attendee objects
          const newAttendees = Array(eventData.quantity).fill(null).map((_, i) => 
            attendees[i] || { name: '', phone: '', instagram: '' }
          );
          setAttendees(newAttendees);
        }
      }
    };

    // Add event listener for updating event data separately
    const handleUpdateEventData = (event: CustomEvent) => {
      if (event.detail.eventData) {
        console.log('Updating event data:', event.detail.eventData);
        setEventData(event.detail.eventData);
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
  }, [quantity, attendees]);

  useEffect(() => {
    // Don't initialize MercadoPago if form is not complete
    if (!isFormComplete) return;
    
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

    const loadMercadoPago = async () => {
      try {
        if (!window.MercadoPago) {
          console.log('Waiting for MercadoPago SDK to load...');
          setTimeout(loadMercadoPago, 500);
          return;
        }

        // Clear container before creating a new Brick
        const container = document.getElementById('cardPayment_container');
        if (container) {
          container.innerHTML = '';
        }

        mpInstance = new window.MercadoPago(import.meta.env.PUBLIC_MERCADOPAGO_KEY, {
          locale: 'es-CL'
        });

        console.log('MercadoPago initialized with amount:', currentAmount);

        cardPaymentBrickRef = await mpInstance.bricks().create("cardPayment", "cardPayment_container", {
          initialization: {
            amount: currentAmount.toString(),
            payer: {
              email: "",
            },
          },
          customization: {
            paymentMethods: {
              maxInstallments: 1,
            },
            visual: {
              style: {
                theme: 'default'
              }
            }
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
                
                // Update local eventData with current attendee information
                const updatedEventData = {
                  ...eventData,
                  attendees: attendees,
                  quantity: quantity,
                  totalAmount: currentAmount
                };
                
                // Update localStorage with the new data
                localStorage.setItem('eventData', JSON.stringify(updatedEventData));
                
                console.log('Final event data for payment:', JSON.stringify(updatedEventData));
                
                const paymentData = {
                  ...cardFormData,
                  transaction_amount: parseFloat(currentAmount.toString()),
                  eventData: updatedEventData,
                  description: eventDetails.description || 'Evento'
                };
                
                console.log('Sending payment data:', JSON.stringify(paymentData));
                
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
                
                // Display user-friendly error message based on error cause
                if (error.cause === 'secure_fields_card_token_creation_failed') {
                  alert('Hubo un problema con la información de la tarjeta. Por favor, verifica que los datos ingresados sean correctos.');
                }
              }
            },
            onBinChange: (bin: string) => {
              console.log('First 6 digits:', bin);
            },
            onFetching: (resource: string) => {
              console.log('Fetching resource:', resource);
            }
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
  }, [currentAmount, eventData, attendees, quantity, isFormComplete, eventDetails]);

  return (
    <div className="space-y-6">
      {/* Use the separate AttendeeForm component */}
      <AttendeeForm 
        attendees={attendees}
        formErrors={formErrors}
        onAttendeeChange={handleAttendeeChange}
      />

      {/* MercadoPago button - only show when form is complete */}
      {isFormComplete ? (
        <div 
          id="cardPayment_container" 
          style={{
            minHeight: '200px',
            width: '100%',
            margin: '10px 0'
          }}
        ></div>
      ) : (
        <div className="p-4 bg-gray-100 rounded-md text-center">
          <p className="text-gray-700">Complete todos los campos obligatorios para continuar con el pago</p>
        </div>
      )}
    </div>
  );
}