import React, { useState } from 'react';

interface FormData {
  nombre: string;
  email: string;
  telefono: string;
  tipoConsulta: string;
  tipoCultivo: string;
  mensaje: string;
}

interface FormErrors {
  nombre?: string;
  email?: string;
  telefono?: string;
  mensaje?: string;
}

function ContactoPersonal() {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    email: '',
    telefono: '',
    tipoConsulta: 'soporte',
    tipoCultivo: 'indoor',
    mensaje: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const tiposConsulta = [
    { id: 'soporte', label: 'Soporte técnico' },
    { id: 'nutrientes', label: 'Consulta sobre nutrientes' },
    { id: 'plagas', label: 'Problemas con plagas' },
    { id: 'equipo', label: 'Equipamiento para cultivo' },
    { id: 'otro', label: 'Otra consulta' },
  ];

  const tiposCultivo = [
    { id: 'indoor', label: 'Cultivo Indoor' },
    { id: 'outdoor', label: 'Cultivo Exterior' },
    { id: 'hidroponico', label: 'Cultivo Hidropónico' },
    { id: 'acuaponico', label: 'Cultivo Acuapónico' },
    { id: 'otro', label: 'Otro tipo de cultivo' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Limpiar error al editar
    if (errors[name as keyof FormErrors]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  const validarFormulario = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }
    
    if (formData.telefono && !/^\+?[0-9]{8,15}$/.test(formData.telefono)) {
      newErrors.telefono = 'El formato del teléfono no es válido';
    }
    
    if (!formData.mensaje.trim()) {
      newErrors.mensaje = 'El mensaje es obligatorio';
    } else if (formData.mensaje.length < 10) {
      newErrors.mensaje = 'El mensaje debe tener al menos 10 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    setEnviando(true);
    
    try {
      // Aquí iría la lógica de envío real
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulación de envío
      setEnviado(true);
      // Resetear formulario después de envío exitoso
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        tipoConsulta: 'soporte',
        tipoCultivo: 'indoor',
        mensaje: '',
      });
    } catch (error) {
      console.error('Error al enviar formulario:', error);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-green-700 mb-6">Contacta con nuestro equipo de expertos</h2>
      
      {enviado ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-green-800 font-medium">¡Mensaje enviado con éxito!</h3>
          </div>
          <p className="mt-2 text-sm text-green-700">
            Gracias por contactarnos. Nuestro equipo de expertos en cultivos revisará tu consulta y te responderá a la brevedad.
          </p>
          <button
            onClick={() => setEnviado(false)}
            className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Enviar otra consulta
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo *
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none ${
                  errors.nombre ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-200'
                }`}
                placeholder="Tu nombre"
              />
              {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none ${
                  errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-200'
                }`}
                placeholder="ejemplo@correo.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none ${
                  errors.telefono ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-200'
                }`}
                placeholder="+1234567890"
              />
              {errors.telefono && <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>}
            </div>
            
            <div>
              <label htmlFor="tipoConsulta" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de consulta
              </label>
              <select
                id="tipoConsulta"
                name="tipoConsulta"
                value={formData.tipoConsulta}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-200 focus:outline-none"
              >
                {tiposConsulta.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="tipoCultivo" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de cultivo
            </label>
            <select
              id="tipoCultivo"
              name="tipoCultivo"
              value={formData.tipoCultivo}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-200 focus:outline-none"
            >
              {tiposCultivo.map(tipo => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 mb-1">
              Mensaje *
            </label>
            <textarea
              id="mensaje"
              name="mensaje"
              value={formData.mensaje}
              onChange={handleChange}
              rows={5}
              className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:outline-none ${
                errors.mensaje ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-green-200'
              }`}
              placeholder="Describe detalladamente tu consulta o problema con el cultivo..."
            />
            {errors.mensaje && <p className="mt-1 text-sm text-red-600">{errors.mensaje}</p>}
          </div>
          
          <div className="flex items-center">
            <input
              id="politicas"
              type="checkbox"
              className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              required
            />
            <label htmlFor="politicas" className="ml-2 block text-sm text-gray-700">
              Acepto la política de privacidad y el tratamiento de mis datos *
            </label>
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={enviando}
              className={`w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 
                ${enviando ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {enviando ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enviando...
                </span>
              ) : 'Enviar consulta'}
            </button>
          </div>
        </form>
      )}
      
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">¿Necesitas ayuda urgente?</h3>
        <p className="text-gray-600">
          Llámanos directamente al <span className="text-green-700 font-medium">+1 (555) 123-4567</span> o escríbenos a{' '}
          <a href="mailto:soporte@farmiemos.com" className="text-green-700 hover:underline">
            soporte@farmiemos.com
          </a>
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Nuestro equipo de expertos en cultivos está disponible de lunes a viernes de 9:00 a 18:00 hrs.
        </p>
      </div>
    </div>
  );
}

export default ContactoPersonal