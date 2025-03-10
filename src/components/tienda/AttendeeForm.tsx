import { useState } from 'react';

interface Attendee {
  name: string;
  phone: string;
  instagram: string;
}

interface AttendeeFormProps {
  attendees: Attendee[];
  formErrors: {[key: string]: boolean};
  onAttendeeChange: (index: number, field: keyof Attendee, value: string) => void;
}

export default function AttendeeForm({ 
  attendees, 
  formErrors, 
  onAttendeeChange 
}: AttendeeFormProps) {
  return (
    <div className="mb-6">
      <h3 className="font-medium text-lg mb-4">Información de asistentes</h3>
      {attendees.map((attendee, index) => (
        <div key={index} className="p-4 border rounded-md mb-4">
          <h4 className="font-medium mb-3">Asistente {index + 1}</h4>
          <div className="space-y-3">
            <div>
              <label htmlFor={`attendee-name-${index}`} className="block text-sm font-medium mb-1">
                Nombre completo *
              </label>
              <input 
                type="text" 
                id={`attendee-name-${index}`}
                value={attendee.name}
                onChange={(e) => onAttendeeChange(index, 'name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${formErrors[`name-${index}`] ? 'border-red-500' : ''}`}
                placeholder="Nombre y apellido"
              />
            </div>
            <div>
              <label htmlFor={`attendee-phone-${index}`} className="block text-sm font-medium mb-1">
                Teléfono *
              </label>
              <input 
                type="tel" 
                id={`attendee-phone-${index}`}
                value={attendee.phone}
                onChange={(e) => onAttendeeChange(index, 'phone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${formErrors[`phone-${index}`] ? 'border-red-500' : ''}`}
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div>
              <label htmlFor={`attendee-instagram-${index}`} className="block text-sm font-medium mb-1">
                Instagram
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">@</span>
                <input 
                  type="text" 
                  id={`attendee-instagram-${index}`}
                  value={attendee.instagram}
                  onChange={(e) => onAttendeeChange(index, 'instagram', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-blue-500"
                  placeholder="username"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 