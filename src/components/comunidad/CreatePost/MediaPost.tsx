import React, { useState } from 'react';

const MediaPost: React.FC = () => {
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Crear nuevos previews sin eliminar los anteriores
    const newPreviews = Array.from(files).map(file => URL.createObjectURL(file));
    // Agregar los nuevos previews a los existentes
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (previewToRemove: string) => {
    // Liberar la URL del objeto y eliminar solo la imagen seleccionada
    URL.revokeObjectURL(previewToRemove);
    setPreviews(prev => prev.filter(preview => preview !== previewToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="text-center p-8 border-2 border-dashed rounded-md bg-gray-50">
        <input 
          type="file" 
          name="media_file" 
          className="hidden" 
          accept="image/*" 
          id="file-input" 
          multiple
          onChange={handleFileChange}
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-1">Arrastra y suelta imágenes o haz clic para seleccionar</p>
            <p className="text-sm text-gray-400">Puedes seleccionar múltiples imágenes</p>
          </div>
        </label>
      </div>

      {/* Preview de imágenes */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {previews.map((preview, index) => (
            <div key={preview} className="relative aspect-square">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                onClick={() => handleRemoveImage(preview)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaPost; 