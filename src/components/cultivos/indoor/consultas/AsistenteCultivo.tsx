import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import type { Message } from 'ai/react';

function AsistenteCultivo() {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Integración con la API de asistente usando el hook useChat de Vercel AI
  const { messages, input, handleInputChange, handleSubmit, setInput, setMessages, isLoading, error } = useChat({
    api: '/api/cultivos/asistente',
    // Opcionalmente podemos pasar el ID del usuario si está disponible
    // body: { userId: 'user-id-here' },
  });

  // Función para manejar la carga de imágenes
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Implementación de la vista previa de la imagen
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // Crear un FormData para subir la imagen
      const formData = new FormData();
      formData.append('file', file);
      
      // Enviar la imagen a un servicio de almacenamiento (por ejemplo, Cloudinary o similar)
      // Este es un ejemplo y debe adaptarse a su backend real
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Error al subir la imagen');
      }
      
      const { url } = await uploadResponse.json();
      setUploadedImageUrl(url);
      setIsUploading(false);
    } catch (error) {
      console.error('Error al cargar la imagen:', error);
      setIsUploading(false);
      // Para propósitos de demostración, vamos a simular que la imagen se subió correctamente
      // En un caso real, mostrarías un mensaje de error
      setUploadedImageUrl(imagePreview);
    }
  };

  // Función para analizar la imagen con IA
  const handleAnalyzeImage = async () => {
    if (!uploadedImageUrl) return;
    
    setIsAnalyzingImage(true);
    
    try {
      // Agregamos un mensaje del usuario con la imagen
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Por favor analiza esta imagen de mi cultivo e identifica posibles problemas o mejoras.`,
      };
      
      setMessages([...messages, userMessage]);
      
      const response = await fetch('/api/cultivos/procesar-imagen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: uploadedImageUrl,
          prompt: 'Analiza esta imagen de mi cultivo e identifica posibles problemas o mejoras.',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error al analizar la imagen');
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No se pudo leer la respuesta');
      
      let partialResponse = '';
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };
      
      // Actualizar mensajes con mensaje vacío inicial
      setMessages([...messages, userMessage, aiMessage]);
      
      // Leer la respuesta en streaming
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        partialResponse += text;
        
        // Actualizar el último mensaje (asistente) con el contenido acumulado
        setMessages((currentMessages) => {
          const updatedMessages = [...currentMessages];
          updatedMessages[updatedMessages.length - 1] = {
            ...updatedMessages[updatedMessages.length - 1],
            content: partialResponse,
          };
          return updatedMessages;
        });
      }
      
    } catch (error) {
      console.error('Error al analizar la imagen:', error);
      // Mostrar mensaje de error
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Lo siento, ha ocurrido un error al analizar la imagen. Por favor, inténtalo de nuevo más tarde.',
        } as Message,
      ]);
    } finally {
      setIsAnalyzingImage(false);
      setImagePreview(null);
      setUploadedImageUrl(null);
    }
  };

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Formatear el contenido del mensaje para renderizar correctamente markdown o sintaxis especial
  const formatMessage = (content: string) => {
    // Implementación básica para mostrar saltos de línea
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        <br />
      </span>
    ));
  };

  // Manejar el envío del formulario
  const onSubmitChat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Si hay una imagen cargada, agregar referencia en el mensaje
    if (imagePreview && !input.trim()) {
      handleAnalyzeImage();
      return;
    }
    
    handleSubmit(e);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gradient-to-b from-emerald-50 to-white rounded-xl shadow-md border border-emerald-100">
      {/* Encabezado */}
      <div className="bg-emerald-600 text-white p-4 rounded-t-xl flex items-center">
        <div className="flex items-center justify-center bg-white rounded-full p-2 mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-emerald-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold">FarmieAI - Asistente de Cultivo</h2>
          <p className="text-sm text-emerald-100">Especialista en resolver tus dudas de cultivo</p>
        </div>
      </div>

      {/* Contenedor de mensajes */}
      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-emerald-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            <h3 className="text-xl font-semibold mb-2">¡Bienvenido al Asistente de Cultivo!</h3>
            <p className="text-center max-w-md">
              Pregúntame sobre cualquier duda que tengas acerca de tu cultivo.
              Puedes consultarme sobre nutrientes, plagas, iluminación, sustrato, o cualquier otra inquietud.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-3/4 rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-emerald-500 text-white rounded-tr-none' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                }`}
              >
                {formatMessage(message.content)}
              </div>
            </div>
          ))
        )}
        
        {(isLoading || isAnalyzingImage) && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 rounded-lg rounded-tl-none p-3 flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-sm text-gray-500">
                {isAnalyzingImage ? 'Analizando imagen...' : 'FarmieAI está pensando...'}
              </span>
            </div>
          </div>
        )}

        {/* Previsualización de imagen */}
        {imagePreview && (
          <div className="flex flex-col items-end mb-2">
            <div className="relative mb-2">
              <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg border border-emerald-300" />
              <button 
                onClick={() => {
                  setImagePreview(null);
                  setUploadedImageUrl(null);
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                title="Eliminar imagen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {uploadedImageUrl && !isUploading && (
              <button
                onClick={handleAnalyzeImage}
                disabled={isAnalyzingImage}
                className={`text-sm px-3 py-1 rounded-lg ${
                  isAnalyzingImage
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                } transition-colors`}
              >
                Analizar imagen
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="p-2 bg-red-100 text-red-700 rounded-lg">
            Error: {error.message || 'Ha ocurrido un error al procesar tu solicitud.'}
          </div>
        )}
      </div>

      {/* Formulario de entrada */}
      <form 
        onSubmit={onSubmitChat} 
        className="p-4 border-t border-gray-200 bg-white rounded-b-xl"
      >
        <div className="flex items-end space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors"
            title="Adjuntar imagen"
            disabled={isLoading || isAnalyzingImage}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
            disabled={isLoading || isAnalyzingImage}
          />
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder={imagePreview ? "Describe tu consulta sobre la imagen..." : "Escribe tu consulta sobre cultivo..."}
              className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none overflow-hidden"
              rows={1}
              disabled={isLoading || isAnalyzingImage}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmitChat(e as any);
                }
              }}
            />
            {isUploading && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-emerald-500"></div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || isAnalyzingImage || (!input.trim() && !imagePreview)}
            className={`p-3 rounded-full ${
              isLoading || isAnalyzingImage || (!input.trim() && !imagePreview)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            } transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

export default AsistenteCultivo;
