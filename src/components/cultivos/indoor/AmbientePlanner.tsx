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
    <div className="grid grid-cols-2 gap-4">
      <input
        {...register(`${prefix}.nombre` as const)}
        placeholder="Nombre"
        className="border p-2 rounded"
      />
      <input
        {...register(`${prefix}.marca` as const)}
        placeholder="Marca"
        className="border p-2 rounded"
      />
      <input
        {...register(`${prefix}.watts` as const, { valueAsNumber: true })}
        type="number"
        placeholder="Watts"
        className="border p-2 rounded"
      />
    </div>
  );

  return (
    <>
      {isLoading ? (
        <div>Cargando...</div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4">
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Ventilación</h2>
            
            <div className="border p-4 rounded">
              <h3 className="font-semibold mb-2">Ventilador</h3>
              <EquipmentFields prefix="ventilador" />
            </div>

            <div className="border p-4 rounded">
              <h3 className="font-semibold mb-2">Extracción</h3>
              <EquipmentFields prefix="extraccion" />
            </div>

            <div className="border p-4 rounded">
              <h3 className="font-semibold mb-2">Intracción</h3>
              <EquipmentFields prefix="intraccion" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('filtroCarbono')}
                  className="form-checkbox"
                />
                <span>Filtro de Carbono</span>
              </label>
            </div>

            <div className="border p-4 rounded">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  {...register('controladorAmbiental.activo')}
                  className="form-checkbox"
                />
                <span>Controlador Ambiental</span>
              </label>
              {watch('controladorAmbiental.activo') && (
                <select
                  {...register('controladorAmbiental.tipo')}
                  className="w-full border p-2 rounded"
                >
                  <option value="">Seleccione tipo</option>
                  <option value="analogico">Analógico</option>
                  <option value="wifi">WiFi</option>
                  <option value="otro">Otro</option>
                </select>
              )}
            </div>

            <div className="border p-4 rounded">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  {...register('medidoresAmbientales.activo')}
                  className="form-checkbox"
                />
                <span>Medidores Ambientales</span>
              </label>
              {watch('medidoresAmbientales.activo') && (
                <select
                  {...register('medidoresAmbientales.tipo')}
                  className="w-full border p-2 rounded"
                >
                  <option value="">Seleccione tipo</option>
                  <option value="analogico">Analógico</option>
                  <option value="wifi">WiFi</option>
                  <option value="otro">Otro</option>
                </select>
              )}
            </div>

            <div className="border p-4 rounded">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  {...register('temporizador.activo')}
                  className="form-checkbox"
                />
                <span>Temporizador</span>
              </label>
              {watch('temporizador.activo') && (
                <select
                  {...register('temporizador.tipo')}
                  className="w-full border p-2 rounded"
                >
                  <option value="">Seleccione tipo</option>
                  <option value="analogico">Analógico</option>
                  <option value="wifi">WiFi</option>
                  <option value="otro">Otro</option>
                </select>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Guardar Configuración
          </button>
        </form>
      )}
    </>
  );
}

export default AmbientePlanner;