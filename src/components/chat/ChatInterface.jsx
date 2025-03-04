import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

const ChatInterface = ({ sessionId, initialSession, profile }) => {
  const [session, setSession] = useState(initialSession || { user_prompt: [], ai_response: [] });
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [session]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleMessageSent = (message) => {
    if (message.type === 'streaming') {
      // Actualizar la respuesta en tiempo real
      setSession(prev => {
        const newSession = { ...prev };
        const lastIndex = newSession.user_prompt.length - 1;
        
        if (lastIndex >= 0) {
          newSession.ai_response[lastIndex] = message.text;
        }
        
        return newSession;
      });
    } else if (message.type === 'complete') {
      // Finalizar la respuesta
      setSession(prev => {
        const newSession = { ...prev };
        const lastIndex = newSession.user_prompt.length - 1;
        
        if (lastIndex >= 0) {
          newSession.ai_response[lastIndex] = message.text;
        }
        
        return newSession;
      });
      setIsLoading(false);
    } else if (message.type === 'error') {
      // Manejar error
      setIsLoading(false);
      // Mostrar mensaje de error
    } else {
      // Nuevo mensaje del usuario
      setIsLoading(true);
      setSession(prev => ({
        ...prev,
        user_prompt: [...prev.user_prompt, message.text],
        ai_response: [...prev.ai_response, null] // Placeholder para la respuesta
      }));
    }
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-h-screen">
      <div className="flex-1 overflow-y-auto">
        <ChatMessage 
          session={session} 
          profile={profile} 
          sessionId={sessionId} 
        />
        <div ref={messagesEndRef} />
      </div>
      
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 pt-2 w-full">
        <ChatInput 
          sessionId={sessionId} 
          onMessageSent={handleMessageSent} 
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default ChatInterface; 