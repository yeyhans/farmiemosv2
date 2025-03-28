import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

interface EquipmentData {
  nombre: string;
  marca: string;
  watts: number;
  tipo?: string;
}

interface AmbienteLog {
  timestamp: string;
  temperatura: number;
  humedad: number;
  vpd: number;
  dewpoint: number;
}

interface AmbienteFormData {
  ventilador: EquipmentData;
  extraccion: EquipmentData;
  intraccion: EquipmentData;
  filtroCarbono: boolean;
  controladorAmbiental: {
    activo: boolean;
    tipo: string;
  };
  medidoresAmbientales: {
    activo: boolean;
    tipo: string;
  };
  temporizador: {
    activo: boolean;
    tipo: string;
  };
}

interface AmbientePlannerProps {
  cultivoId: string;
}

function AmbientePlanner({ cultivoId }: AmbientePlannerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ventilacion');

  const { register, handleSubmit, watch, reset } = useForm<AmbienteFormData>({
    defaultValues: {
      ventilador: { nombre: '', marca: '', watts: 0 },
      extraccion: { nombre: '', marca: '', watts: 0 },
      intraccion: { nombre: '', marca: '', watts: 0 },
      filtroCarbono: false,
      controladorAmbiental: { activo: false, tipo: '' },
      medidoresAmbientales: { activo: false, tipo: '' },
      temporizador: { activo: false, tipo: '' }
    }
  });

  useEffect(() => {
    const fetchAmbienteData = async () => {
      try {
        const response = await fetch(`/api/cultivos/config-ambiente?cultivoId=${cultivoId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          reset(result.data);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAmbienteData();
  }, [cultivoId, reset]);

  const onSubmit = async (data: AmbienteFormData) => {
    try {
      const response = await fetch('/api/cultivos/config-ambiente', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId: cultivoId,
          ambiente: data,
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert('Configuración guardada exitosamente');
      } else {
        alert(`Error: ${result.error || 'Error desconocido al guardar'}`);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar la configuración');
    }
  };

  const EquipmentFields = ({ prefix }: { prefix: 'ventilador' | 'extraccion' | 'intraccion' }) => (
    <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <input
        {...register(`${prefix}.nombre` as const)}
        placeholder="Nombre"
        className="border p-1.5 rounded text-sm w-full"
      />
      <input
        {...register(`${prefix}.marca` as const)}
        placeholder="Marca"
        className="border p-1.5 rounded text-sm w-full"
      />
      <input
        {...register(`${prefix}.watts` as const, { valueAsNumber: true })}
        type="number"
        placeholder="Watts"
        className="border p-1.5 rounded text-sm w-full"
      />
    </div>
  );

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center p-4">
          <div className="animate-pulse text-gray-500">Cargando...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="">
          {/* Tabs Navigation */}
          <div className="flex border-b mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('ventilacion')}
              className={`py-2 px-4 font-medium ${
                activeTab === 'ventilacion'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Ventilación
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('accesorios')}
              className={`py-2 px-4 font-medium ${
                activeTab === 'accesorios'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Accesorios
            </button>
          </div>

          {/* Ventilación Tab */}
          {activeTab === 'ventilacion' && (
            <div className="space-y-3">
              <div className="bg-white rounded-lg shadow-sm border p-4 transition-all hover:shadow-md">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Ventilador
                </h3>
                <EquipmentFields prefix="ventilador" />
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4 transition-all hover:shadow-md">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18" />
                  </svg>
                  Extracción
                </h3>
                <EquipmentFields prefix="extraccion" />
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4 transition-all hover:shadow-md">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center mb-2">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 17l-4 4m0 0l-4-4m4 4V3" />
                  </svg>
                  Intracción
                </h3>
                <EquipmentFields prefix="intraccion" />
              </div>
            </div>
          )}

          {/* Accesorios Tab */}
          {activeTab === 'accesorios' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg shadow-sm border p-3 transition-all hover:shadow-md flex items-center">
                <input
                  type="checkbox"
                  {...register('filtroCarbono')}
                  className="form-checkbox h-4 w-4 text-green-500"
                />
                <span className="ml-2 text-sm">Filtro de Carbono</span>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-3 transition-all hover:shadow-md">
                <label className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    {...register('controladorAmbiental.activo')}
                    className="form-checkbox h-4 w-4 text-green-500"
                  />
                  <span className="ml-2 text-sm">Controlador Ambiental</span>
                </label>
                {watch('controladorAmbiental.activo') && (
                  <select
                    {...register('controladorAmbiental.tipo')}
                    className="w-full border p-1.5 rounded text-sm bg-gray-50"
                  >
                    <option value="">Seleccione tipo</option>
                    <option value="analogico">Analógico</option>
                    <option value="wifi">WiFi</option>
                    <option value="otro">Otro</option>
                  </select>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-3 transition-all hover:shadow-md">
                <label className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    {...register('medidoresAmbientales.activo')}
                    className="form-checkbox h-4 w-4 text-green-500"
                  />
                  <span className="ml-2 text-sm">Medidores Ambientales</span>
                </label>
                {watch('medidoresAmbientales.activo') && (
                  <select
                    {...register('medidoresAmbientales.tipo')}
                    className="w-full border p-1.5 rounded text-sm bg-gray-50"
                  >
                    <option value="">Seleccione tipo</option>
                    <option value="analogico">Analógico</option>
                    <option value="wifi">WiFi</option>
                    <option value="otro">Otro</option>
                  </select>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-3 transition-all hover:shadow-md">
                <label className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    {...register('temporizador.activo')}
                    className="form-checkbox h-4 w-4 text-green-500"
                  />
                  <span className="ml-2 text-sm">Temporizador</span>
                </label>
                {watch('temporizador.activo') && (
                  <select
                    {...register('temporizador.tipo')}
                    className="w-full border p-1.5 rounded text-sm bg-gray-50"
                  >
                    <option value="">Seleccione tipo</option>
                    <option value="analogico">Analógico</option>
                    <option value="wifi">WiFi</option>
                    <option value="otro">Otro</option>
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Submit Button - Fixed at bottom */}
          <div className="mt-6 sticky bottom-0 py-2 bg-white border-t">
            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 px-4 rounded-full hover:bg-green-600 transition-colors flex justify-center items-center shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Guardar Configuración
            </button>
          </div>
        </form>
      )}
    </>
  );
}

export default AmbientePlanner;