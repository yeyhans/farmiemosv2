import React, { useState, useRef, useEffect } from 'react';

export default function Faqs() {
  const [messages, setMessages] = useState([
    {
      type: 'ai',
      content: '¡Hola! Soy tu asistente de Farmiemos. ¿En qué puedo ayudarte?',
      isTyping: true
    }
  ]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);
  
  // Simular efecto de escritura para el mensaje inicial
  useEffect(() => {
    const initialMessage = '¡Hola! Soy tu asistente de Farmiemos. ¿En qué puedo ayudarte?';
    let displayedText = '';
    let index = 0;
    
    const typingInterval = setInterval(() => {
      if (index < initialMessage.length) {
        displayedText += initialMessage[index];
        setMessages([{
          type: 'ai',
          content: displayedText,
          isTyping: index < initialMessage.length - 1
        }]);
        index++;
      } else {
        clearInterval(typingInterval);
        setMessages([{
          type: 'ai',
          content: initialMessage,
          isTyping: false
        }]);
      }
    }, 30); // Velocidad de escritura (ms)
    
    return () => clearInterval(typingInterval);
  }, []);
  
  // Función para formatear respuestas
  const formatResponse = (response) => {
    return response
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\d+\.\s/g, '<br><span class="text-custom-green">•</span> ')
      .replace(/🌱|🌿|✅/g, match => 
        `<span class="text-2xl">${match}</span>`);
  };
  
  // Función para establecer preguntas predefinidas
  const setQuestion = (question) => {
    setPrompt(question);
    handleSubmit(new Event('submit', { cancelable: true, bubbles: true }) as React.FormEvent, question);
  };
  
  // Manejar el envío del formulario
  const handleSubmit = async (e: React.FormEvent, predefinedQuestion: string | null = null) => {
    e.preventDefault();
    
    const userQuestion = predefinedQuestion || prompt;
    if (!userQuestion.trim()) return;
    
    // Agregar mensaje del usuario
    setMessages(prev => [...prev, { type: 'user', content: userQuestion }]);
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('prompt', userQuestion);
      
      // Agregar mensaje de carga
      setMessages(prev => [...prev, { type: 'ai', content: '', loading: true }]);
      setPrompt('');
      
      // Hacer fetch y manejar streaming
      const response = await fetch('/api/chat/faqs', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      if (!response.body) throw new Error('No se recibió respuesta');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseBuffer = '';
      
      // Eliminar el mensaje de carga
      setMessages(prev => prev.slice(0, -1));
      
      // Agregar mensaje vacío para la respuesta
      setMessages(prev => [...prev, { type: 'ai', content: '' }]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Procesar chunks
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const content = JSON.parse(line.replace('data: ', ''));
              responseBuffer += content;
              
              // Actualizar el último mensaje
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = responseBuffer;
                return newMessages;
              });
            } catch (error) {
              console.error('Error parsing JSON:', line, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      // Agregar mensaje de error
      setMessages(prev => [...prev.slice(0, -1), { 
        type: 'error', 
        content: `Error: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Desplazarse al final del chat cuando se agregan nuevos mensajes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Estilos para el indicador de escritura
  const styles = `
    .typing-indicator span {
      display: inline-block;
      width: 8px;
      height: 8px;
      margin-right: 3px;
      background: rgba(255,255,255,0.7);
      border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out;
    }

    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    
    .animate-blink {
      animation: blink 0.8s infinite;
    }
  `;
  
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <section id="faqs" className="py-12">
        {/* Título de la página */}
        <h1 className="text-center text-2xl font-black text-custom-yellow md:text-3xl mb-4">
          ¡FAQ's de <span className="text-custom-green">Farmiemos!</span>
        </h1>

        {/* Contenedor del chat */}
        <div className="mx-auto bg-white rounded-lg shadow-lg p-4 max-w-3xl">
          {/* Historial del chat */}
          <div 
            id="chatContainer" 
            ref={chatContainerRef}
            className="h-72 overflow-y-auto mb-3 space-y-3 text-sm"
          >
            {messages.map((message, index) => (
              <div key={index} className={`flex justify-${message.type === 'user' ? 'end' : 'start'}`}>
                <div 
                  className={`${
                    message.type === 'user' 
                      ? 'bg-custom-blue text-white' 
                      : message.type === 'error'
                        ? 'bg-red-500 text-white'
                        : 'bg-custom-green text-white'
                  } rounded-lg p-2 max-w-[70%] text-sm`}
                >
                  {message.loading ? (
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  ) : (
                    <>
                      <div dangerouslySetInnerHTML={{ __html: message.type === 'ai' ? formatResponse(message.content) : message.content }} />
                      {message.isTyping && (
                        <span className="inline-block w-1 h-4 ml-1 bg-white animate-blink"></span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Globos de preguntas predefinidas */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setQuestion('¿Cómo usar Farmienda?')}
              className="bg-blue-900 text-custom-blue rounded-full px-3 py-1 hover:bg-custom-blue/20 transition-colors text-xs"
            >
              ¿Cómo usar Farmienda?
            </button>
            <button
              onClick={() => setQuestion('¿Qué servicios más tienen?')}
              className="bg-blue-900 text-custom-blue rounded-full px-3 py-1 hover:bg-custom-blue/20 transition-colors text-xs"
            >
              ¿Qué servicios más tienen?
            </button>
            <button
              onClick={() => setQuestion('¿Qué nutrientes base son compatibles con este producto?')}
              className="bg-blue-900 text-custom-blue rounded-full px-3 py-1 hover:bg-custom-blue/20 transition-colors text-xs"
            >
              ¿Qué nutrientes base son compatibles?
            </button>
          </div>

          {/* Formulario para enviar preguntas */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Escribe tu pregunta..."
              required
              className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-custom-blue"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-custom-blue text-white rounded-lg px-3 py-1 text-sm hover:bg-custom-blue/90 transition-colors"
            >
              Enviar
            </button>
          </form>
        </div>
      </section>
    </>
  );
} 