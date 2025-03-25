import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

// Componentes para las diferentes secciones
import PersonalSection from './PersonalSection';
import ObjectiveSection from './ObjectiveSection';
import InterestsSection from './InterestsSection';
import ProfileBio from './ProfileBio';

export default function ProfileForm({ initialData }) {
  const [activeSection, setActiveSection] = useState('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(initialData?.img_avatar || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);
  
  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm({
    defaultValues: initialData || {}
  });

  // Verificar si la imagen del avatar se carga correctamente
  useEffect(() => {
    if (initialData?.img_avatar) {
      // Verificar si la URL de la imagen es válida
      const img = new Image();
      img.onload = () => {
        console.log("Avatar cargado correctamente:", initialData.img_avatar);
        setAvatarPreview(initialData.img_avatar);
      };
      img.onerror = () => {
        console.error("Error cargando avatar:", initialData.img_avatar);
        setAvatarPreview(null); // Resetear a null para mostrar el emoji por defecto
      };
      img.src = initialData.img_avatar;
    }
  }, [initialData?.img_avatar]);

  const sections = [
    { id: 'personal', label: 'Datos Personales', component: PersonalSection },
    { id: 'objetivos', label: 'Objetivo de Cultivo', component: ObjectiveSection },
    { id: 'intereses', label: 'Intereses', component: InterestsSection }
  ];

  // Función para manejar la selección de avatar
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.type.match('image.*')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }
    
    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB');
      return;
    }
    
    // Crear preview para mostrar
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
    
    // Guardar file para subir después
    setAvatarFile(file);
  };

  // Abrir el selector de archivos
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Crear FormData
      const formData = new FormData();
      
      // Agregar todos los campos del formulario
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      
      // Agregar el avatar si existe
      if (avatarFile) {
        formData.append("avatar_image", avatarFile);
      }
      
      // Enviar formulario a la API
      const response = await fetch('/api/profile/edit', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar el perfil');
      }
      
      setSubmitSuccess(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
      
    } catch (error) {
      setSubmitError(error.message);
      console.error('Error al enviar el formulario:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center sm:text-left">Mi Perfil</h1>
      
      {submitSuccess && (
        <div className="mb-4 sm:mb-6 p-3 bg-green-100 text-green-800 rounded-md shadow-sm">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>¡Perfil guardado correctamente! Redirigiendo...</p>
          </div>
        </div>
      )}
      
      {submitError && (
        <div className="mb-4 sm:mb-6 p-3 bg-red-100 text-red-800 rounded-md shadow-sm">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p>Error: {submitError}</p>
          </div>
        </div>
      )}
      
      {/* Avatar y Biografía - Siempre visibles */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-center md:items-start">
          {/* Sección de Avatar */}
          <div className="flex flex-col items-center">
            <div 
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer mb-2 border-2 border-green-500 hover:border-green-600 transition-colors shadow-sm"
              onClick={openFileSelector}
            >
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error("Error cargando imagen");
                    e.target.src = ""; 
                    e.target.style.display = "none";
                    setAvatarPreview(null);
                  }}
                />
              ) : (
                <span className="text-3xl sm:text-4xl">🧑‍🌾</span>
              )}
            </div>
            <button 
              type="button" 
              onClick={openFileSelector}
              className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              Cambiar Avatar
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </div>
          
          {/* Sección de Biografía */}
          <div className="flex-1 w-full">
            <ProfileBio 
              initialBio={initialData?.prompt_profile} 
              userId={initialData?.user_id}
            />
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-4 sm:p-6 rounded-lg shadow-md" encType="multipart/form-data">
        {/* Navegación entre secciones */}
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {sections.map(section => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`px-2 py-2 sm:px-4 sm:py-2 rounded-md transition-colors text-xs sm:text-sm font-medium ${
                activeSection === section.id 
                  ? 'bg-green-600 text-white shadow-sm' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
        
        {/* Contenido de las secciones */}
        <div className="border-t border-gray-200 pt-4">
          {sections.map(section => {
            const SectionComponent = section.component;
            return (
              <div 
                key={section.id} 
                className={activeSection === section.id ? '' : 'hidden'}
              >
                <SectionComponent 
                  register={register} 
                  errors={errors} 
                  control={control} 
                  watch={watch}
                  setValue={setValue}
                />
                
                <div className="mt-6 flex justify-between">
                  {section.id !== sections[0].id && (
                    <button 
                      type="button" 
                      onClick={() => {
                        const currentIndex = sections.findIndex(s => s.id === activeSection);
                        setActiveSection(sections[currentIndex - 1].id);
                      }}
                      className="px-3 py-1 sm:px-4 sm:py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium shadow-sm flex items-center"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Anterior
                    </button>
                  )}
                  
                  {section.id !== sections[sections.length - 1].id ? (
                    <button 
                      type="button"
                      onClick={() => {
                        const currentIndex = sections.findIndex(s => s.id === activeSection);
                        setActiveSection(sections[currentIndex + 1].id);
                      }}
                      className="ml-auto px-3 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium shadow-sm flex items-center"
                    >
                      Siguiente
                      <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        
        <button 
          type="submit"
          disabled={isSubmitting}
          className={`w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 ${
            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Guardando...
            </span>
          ) : 'Guardar Perfil'}
        </button>
      </form>
    </div>
  );
} 