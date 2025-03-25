import { useState, useEffect } from 'react';

export default function ProfileBio({ initialBio, userId }) {
  const [bio, setBio] = useState(initialBio || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Actualizar bio cuando cambia initialBio
  useEffect(() => {
    if (initialBio) {
      setBio(initialBio);
    }
  }, [initialBio]);

  // Verificar si hay un perfil guardado al montar el componente
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!userId) return;
      
      try {
        const response = await fetch(`/api/profile/get-bio?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.bio) {
            setBio(data.bio);
          }
        }
      } catch (err) {
        console.error("Error obteniendo biografía:", err);
      }
    };

    if (!initialBio) {
      checkExistingProfile();
    }
  }, [userId, initialBio]);

  const generateBio = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await fetch('/api/profile/generate-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      
      if (!response.ok) {
        throw new Error('Error al generar la biografía');
      }
      
      const data = await response.json();
      
      if (data.success && data.content) {
        setBio(data.content);
        await saveBio(data.content);
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
      
    } catch (err) {
      console.error('Error generando biografía:', err);
      setError('No se pudo generar la biografía. Intenta de nuevo más tarde.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const saveBio = async (bioText) => {
    try {
      const response = await fetch('/api/profile/update-bio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          bio: bioText 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error al guardar la biografía');
      }
      
    } catch (err) {
      console.error('Error guardando biografía:', err);
      setError('No se pudo guardar la biografía. Intenta de nuevo más tarde.');
    }
  };
  
  const handleSaveEdit = async () => {
    try {
      await saveBio(bio);
      setIsEditing(false);
    } catch (err) {
      // Error ya manejado en saveBio
    }
  };

  return (
    <div className="w-full bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
        <h3 className="text-base sm:text-lg font-semibold">Mi biografía</h3>
        
        {!isEditing ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-2 py-1 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center"
            >
              <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button
              onClick={generateBio}
              disabled={isGenerating}
              className={`px-2 py-1 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1 ${
                isGenerating ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden sm:inline">Generando...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="hidden sm:inline">Generar con IA</span>
                  <span className="sm:hidden">IA</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-2 py-1 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center"
            >
              <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-2 py-1 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            >
              <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Guardar
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mb-3 p-2 bg-red-100 text-red-700 text-xs sm:text-sm rounded flex items-center">
          <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      
      {isEditing ? (
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full border border-gray-300 rounded-md p-2 min-h-[100px] text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Escribe una breve biografía sobre ti y tu experiencia con el cultivo..."
        />
      ) : (
        <div className="prose prose-sm max-w-none">
          {bio ? (
            <p className="text-gray-700 text-xs sm:text-sm">{bio}</p>
          ) : (
            <p className="text-gray-500 italic text-xs sm:text-sm">
              Agrega una biografía o genera una automáticamente para presentarte ante la comunidad.
            </p>
          )}
        </div>
      )}
    </div>
  );
} 