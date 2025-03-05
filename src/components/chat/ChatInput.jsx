import React, { useState, useRef } from 'react';
import { marked } from 'marked';

const ChatInput = ({ sessionId, onMessageSent }) => {
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const fileInputRef = useRef(null);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Crear una URL temporal para la imagen
      const imageUrl = URL.createObjectURL(selectedFile);
      setImagePreview(imageUrl);
    } else {
      setFile(null);
      setImagePreview(null);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isStreaming || !prompt.trim()) return;
    
    try {
      setIsStreaming(true);
      
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('sessionId', sessionId);
      
      if (file) {
        formData.append('file', file);
      }
      
      // Crear una copia del mensaje del usuario para pasarlo al componente padre
      const userMessage = {
        text: prompt,
        imageUrl: imagePreview
      };
      
      // Limpiar el formulario
      setPrompt('');
      setFile(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notificar al componente padre sobre el nuevo mensaje
      if (onMessageSent) {
        onMessageSent(userMessage);
      }
      
      // Iniciar streaming de la respuesta con un timeout más amplio
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos
      
      const res = await fetch('/api/chat/assistents', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      // Establecer un contador de reintentos para manejar interrupciones temporales
      let retryCount = 0;
      const maxRetries = 3;
      
      while (true) {
        try {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          fullResponse += chunk;
          
          // Verificar si la respuesta contiene una marca de finalización
          if (chunk.includes('[FIN]')) {
            fullResponse = fullResponse.replace('[FIN]', '');
            break;
          }
          
          // Actualizar la respuesta en tiempo real
          if (onMessageSent) {
            onMessageSent({
              type: 'streaming',
              text: fullResponse
            });
          }
          
          // Restablecer contador de reintentos cuando recibimos datos con éxito
          retryCount = 0;
        } catch (streamError) {
          // Intentar recuperarse de errores temporales
          if (retryCount < maxRetries) {
            retryCount++;
            console.warn(`Error en el stream (intento ${retryCount}/${maxRetries}):`, streamError);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo antes de reintentar
            continue;
          }
          throw streamError;
        }
      }
      
      clearTimeout(timeoutId);
      
      // Finalizar stream y enviar respuesta completa
      if (onMessageSent) {
        onMessageSent({
          type: 'complete',
          text: fullResponse
        });
      }
      
    } catch (error) {
      console.error('Error:', error);
      if (onMessageSent) {
        onMessageSent({
          type: 'error',
          error: error.message || 'Error en el servidor'
        });
      }
    } finally {
      setIsStreaming(false);
    }
  };
  
  return (
    <section className="input-container">
      <form id="chatForm" className="max-w-6xl mx-auto" onSubmit={handleSubmit}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <input 
              type="text" 
              name="prompt" 
              id="prompt" 
              placeholder="Ej. ¿Cómo puedo mejorar mis cultivos?" 
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-300 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 items-end">
            <label className="flex items-center justify-center w-12 h-12 rounded-lg border border-gray-300 hover:bg-gray-50 cursor-pointer">
              <input 
                type="file" 
                name="file" 
                ref={fileInputRef}
                accept="image/*" 
                className="hidden"
                onChange={handleFileChange}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </label>
            <button 
              type="submit" 
              className="w-12 h-12 bg-green-900 text-white rounded-lg hover:bg-green-700 transition duration-300 flex items-center justify-center"
              disabled={isStreaming}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Vista previa de la imagen */}
        {imagePreview && (
          <div className="mt-4">
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Vista previa" 
                className="max-w-full h-auto max-h-40 rounded-lg shadow-sm" 
              />
              <button
                type="button"
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                onClick={() => {
                  setFile(null);
                  setImagePreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </form>
    </section>
  );
};

export default ChatInput; 