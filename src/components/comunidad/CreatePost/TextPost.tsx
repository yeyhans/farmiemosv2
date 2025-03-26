import React from 'react';

const TextPost: React.FC = () => {
  return (
    <textarea
      name="content"
      className="w-full h-40 p-4 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
      placeholder="Escribe tu texto aquí..."
    />
  );
};

export default TextPost; 