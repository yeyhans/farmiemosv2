import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

const MessageActions = ({ index, message, onLike, onDislike, onCopy, feedback }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await onCopy(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="flex justify-between items-center mt-4">
      <div className="sm:flex gap-2">
        {/* Botón Copiar */}
        <button
          className="p-2 rounded-full hover:bg-blue-100 transition-colors duration-200"
          onClick={handleCopy}
          title="Copiar respuesta"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
          )}
        </button>
        
        {/* Botón Me gusta */}
        <button
          className={`p-2 rounded-full hover:bg-green-100 transition-colors duration-200 
            ${feedback?.isLiked === true ? 'bg-green-200' : ''} 
            ${feedback?.isLiked !== undefined ? 'opacity-50' : ''}`}
          onClick={() => onLike(index)}
          disabled={feedback?.isLiked !== undefined}
          title="Me gusta"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
        </button>
        
        {/* Botón No me gusta */}
        <button
          className={`p-2 rounded-full hover:bg-red-100 transition-colors duration-200
            ${feedback?.isLiked === false ? 'bg-red-200' : ''}
            ${feedback?.isLiked !== undefined ? 'opacity-50' : ''}`}
          onClick={() => onDislike(index)}
          disabled={feedback?.isLiked !== undefined}
          title="No me gusta"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div className="typing-indicator">
    <span className="dot"></span>
    <span className="dot"></span>
    <span className="dot"></span>
    <span className="text text-sm">Escribiendo respuesta...</span>
  </div>
);

const ChatMessage = ({ session, profile, sessionId }) => {
  const [feedbacks, setFeedbacks] = useState({});
  
  useEffect(() => {
    // Cargar el estado de feedback al montar el componente
    loadFeedbackStatus();
  }, []);
  
  const loadFeedbackStatus = async () => {
    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      
      const response = await fetch('/api/chat/feedback-status', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar el estado de feedback');
      }
      
      const { feedbacks: feedbackData } = await response.json();
      
      // Convertir array a objeto para fácil acceso
      const feedbackMap = {};
      feedbackData.forEach(feedback => {
        feedbackMap[feedback.message_index] = {
          isLiked: feedback.is_liked === 1 ? true : feedback.is_liked === 0 ? false : undefined
        };
      });
      
      setFeedbacks(feedbackMap);
    } catch (error) {
      console.error('Error al cargar el estado de feedback:', error);
    }
  };
  
  const handleLike = async (index) => {
    await handleFeedback(index, true);
  };
  
  const handleDislike = async (index) => {
    await handleFeedback(index, false);
  };
  
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Error al copiar:', error);
      return false;
    }
  };
  
  const handleFeedback = async (index, isLiked) => {
    try {
      const formData = new FormData();
      formData.append('index', index.toString());
      formData.append('isLiked', isLiked.toString());
      formData.append('sessionId', sessionId);
      
      const response = await fetch('/api/chat/feedback', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar feedback');
      }
      
      // Actualizar estado local
      setFeedbacks(prev => ({
        ...prev,
        [index]: { isLiked }
      }));
    } catch (error) {
      console.error('Error:', error);
      alert('Error al enviar el feedback');
    }
  };
  
  if (!session) return <div>Cargando conversación...</div>;
  
  return (
    <section className="messages-container bg-gray-50 rounded-lg shadow-md">
      <div id="conversationContainer" className="space-y-6">
        {session.user_prompt.map((userPrompt, index) => (
          <div key={index} className="space-y-4">
            {/* Mensaje del usuario */}
            <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
              <strong className="text-green-800 font-semibold text-sm">{profile.user_name}:</strong>
              <span className="ml-2 text-gray-700 whitespace-pre-wrap text-sm">{userPrompt}</span>
            </div>
            
            {/* Respuesta del asistente */}
            {session.ai_response[index] ? (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col">
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <strong className="text-blue-600 font-semibold text-sm">Asistente:</strong>
                    </div>
                    
                    <div className="text-gray-800 text-sm">
                      {/* Mostrar el texto procesado como Markdown */}
                      <div 
                        className="markdown-content text-sm" 
                        dangerouslySetInnerHTML={{ __html: marked(session.ai_response[index]) }}
                      />
                    </div>
                  </div>
                  
                  {/* Botones de acción */}
                  <MessageActions 
                    index={index}
                    message={session.ai_response[index]}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    onCopy={handleCopy}
                    feedback={feedbacks[index]}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col">
                  <div className="flex-grow space-y-2">
                    <div className="text-gray-800">
                      <TypingIndicator />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ChatMessage; 