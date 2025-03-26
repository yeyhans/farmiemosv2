import React, { useState } from 'react';
import TabSelector from './TabSelector';
import TextPost from './TextPost';
import MediaPost from './MediaPost';
import LinkPost from './LinkPost';
import PollPost from './PollPost';

const CreatePost: React.FC = () => {
  const [postType, setPostType] = useState<'texto' | 'multimedia' | 'enlace' | 'encuesta'>('texto');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      const response = await fetch('/api/comunidad/create-post', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = '/comunidad';
      } else {
        alert(data.error || 'Error al crear el post');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear el post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="border rounded-lg shadow-md bg-white hover:shadow-lg transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between py-4 px-6 border-b">
          <h2 className="text-2xl font-bold">📝 Publicar</h2>
          <select className="px-4 py-2 border rounded-md bg-gray-100 cursor-not-allowed" disabled>
            <option value="">Seleccionar comunidad</option>
            <option value="1">Próximamente</option>
          </select>
        </div>

        {/* Tab Selector */}
        <TabSelector activeTab={postType} onTabChange={setPostType} />

        {/* Form */}
        <form className="p-6" onSubmit={handleSubmit} encType="multipart/form-data">
          <input type="hidden" name="type" value={postType} />
          
          {/* Title Input */}
          <div className="space-y-4">
            <div>
              <input
                type="text"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Título*"
                maxLength={300}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {title.length}/300
              </div>
            </div>

            {/* Dynamic Content */}
            <div className="min-h-[200px] border rounded-md p-4">
              {postType === 'texto' && <TextPost />}
              {postType === 'multimedia' && <MediaPost />}
              {postType === 'enlace' && <LinkPost />}
              {postType === 'encuesta' && <PollPost />}
            </div>

            {/* Tags */}
            <div>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-md bg-gray-100 cursor-not-allowed"
                placeholder="Añadir marcas (próximamente)"
                disabled
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                Guardar borrador
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost; 