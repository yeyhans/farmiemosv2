import React from 'react';

const LinkPost: React.FC = () => {
  return (
    <input
      type="url"
      name="link_url"
      className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
      placeholder="Enlazar URL*"
    />
  );
};

export default LinkPost; 