import React from 'react';

const PollPost: React.FC = () => {
  return (
    <div className="space-y-4">
      <input
        type="text"
        name="poll_question"
        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        placeholder="Pregunta de la encuesta"
      />
      <div className="space-y-2">
        <input
          type="text"
          name="poll_options"
          className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Opción 1"
        />
        <input
          type="text"
          name="poll_options"
          className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="Opción 2"
        />
      </div>
    </div>
  );
};

export default PollPost; 