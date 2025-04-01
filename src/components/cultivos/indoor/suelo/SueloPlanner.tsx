import { useState, useEffect } from 'react';

interface SueloPlannerProps {
  cultivoId: string;
  ambiente: any;
}

interface ComposicionSuelo {
  tierra: number;
  humus: number;
  compost: number;
  fibraCoco: number;
  perlita: number;
  vermiculita: number;
  otro?: {
    nombre: string;
    porcentaje: number;
  };
}

interface SueloConfig {
  tipo: 'suelo' | 'sustrato';
  marca?: string;
  cantidad?: number;
  composicion?: ComposicionSuelo;
}

interface Strain {
  id: number;
  color?: string;
  nombre: string;
  selected: false;
  nombreBase?: string;
  suelo?: {
    modo: 'unificado' | 'porEtapa';
    configuracion: {
      propagacion?: SueloConfig;
      vegetacion?: SueloConfig;
      floracion?: SueloConfig;
      unificado?: SueloConfig;
    };
  };
}

function SueloPlanner({ cultivoId, ambiente }: SueloPlannerProps) {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [selectedStrainIds, setSelectedStrainIds] = useState<number[]>([]);
  const [medioSeleccionado, setMedioSeleccionado] = useState<'suelo' | 'sustrato'>('suelo');
  const [marcaSustrato, setMarcaSustrato] = useState('');
  const [cantidadSustrato, setCantidadSustrato] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [componentesSuelo, setComponentesSuelo] = useState({
    tierra: 0,
    humus: 0,
    perlita: 0,
    vermiculita: 0,
  });

  const [componentesSeleccionados, setComponentesSeleccionados] = useState<string[]>([]);
  const [showOtroModal, setShowOtroModal] = useState(false);
  const [otroComponente, setOtroComponente] = useState('');
  
  const [medidaSeleccionada, setMedidaSeleccionada] = useState<'litros' | 'porcentaje'>('litros');
  const [totalLitros, setTotalLitros] = useState<number>(0);
  const [componentesLitros, setComponentesLitros] = useState<Record<string, number>>({});

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Primero, actualiza el estado de etapaCrecimiento para manejar múltiples selecciones
  const [etapasSeleccionadas, setEtapasSeleccionadas] = useState<string[]>([]);

  // Add state for tracking configured stages
  const [configuracionesEtapas, setConfiguracionesEtapas] = useState<Record<string, SueloConfig>>({});

  const componentesDisponibles = [
    { id: 'tierra', nombre: 'Tierra', emoji: '🌍', descripcion: 'Base principal del sustrato' },
    { id: 'humus', nombre: 'Humus', emoji: '🐛', descripcion: 'Rico en nutrientes y microorganismos' },
    { id: 'compost', nombre: 'Compost', emoji: '🍂', descripcion: 'Materia orgánica descompuesta' },
    { id: 'fibraCoco', nombre: 'Fibra de Coco', emoji: '🥥', descripcion: 'Mejora retención de agua' },
    { id: 'perlita', nombre: 'Perlita', emoji: '⚪', descripcion: 'Mejora aireación' },
    { id: 'vermiculita', nombre: 'Vermiculita', emoji: '🔘', descripcion: 'Retiene nutrientes y agua' },
    { id: 'bokashi', nombre: 'Bokashi', emoji: '🍱', descripcion: 'Aporte de nutrientes fermentados y microorganismos' },
    { id: 'turba', emoji: '🟤', nombre: 'Turba', descripcion: 'Mejora la retención de humedad' },
    { id: 'ceniza', emoji: '🔥', nombre: 'Ceniza', descripcion: 'Aporta minerales y regula pH' },
    { id: 'guano', emoji: '🦇', nombre: 'Guano', descripcion: 'Fuente natural de nitrógeno y fósforo' },
    { id: 'biochar', emoji: '♨️', nombre: 'Biochar', descripcion: 'Mejora la estructura del suelo y la retención de carbono' },
    { id: 'otro', emoji: '➕', nombre: 'Otro', descripcion: 'Agregar componente personalizado' },
];

// Agregar la lista de componentes especializados después de componentesDisponibles
const componentesEspecializados = [
  { id: 'arena', emoji: '🪨', nombre: 'Arena', descripcion: 'Mejora el drenaje y evita compactación' },
  { id: 'arcilla', emoji: '🏔️', nombre: 'Arcilla', descripcion: 'Aumenta retención de agua (en exceso compacta)' },
  { id: 'zeolita', emoji: '💎', nombre: 'Zeolita', descripcion: 'Libera nutrientes y agua gradualmente' },
  { id: 'turbaRubia', emoji: '🌿', nombre: 'Turba rubia', descripcion: 'Acidifica el suelo (ideal para plantas acidófilas)' },
  { id: 'salesMinerales', emoji: '🧂', nombre: 'Sales minerales (NPK)', descripcion: 'Aporte rápido de nutrientes esenciales' },
  { id: 'microorganismos', emoji: '🦠', nombre: 'Microorganismos eficientes (EM)', descripcion: 'Mejoran la salud del suelo' },
  { id: 'teCompost', emoji: '🍵', nombre: 'Té de compost', descripcion: 'Líquido rico en microbios beneficiosos' },
  { id: 'cortezaPino', emoji: '🌲', nombre: 'Corteza de pino', descripcion: 'Mejora drenaje (ideal para orquídeas)' },
  { id: 'hidrogel', emoji: '🌊', nombre: 'Hidrogel', descripcion: 'Polímeros que retienen agua' },
  { id: 'aserrin', emoji: '🪵', nombre: 'Aserrín compostado', descripcion: 'Materia orgánica (evitar fresco)' },
  { id: 'estiercol', emoji: '💩', nombre: 'Estiércol compostado', descripcion: 'Fuente rica en nutrientes (debe estar curado)' },
  { id: 'micorrizas', emoji: '🦠', nombre: 'Micorrizas', descripcion: 'Hongos que mejoran absorción de raíces' },
  { id: 'lombricomposta', emoji: '🌱', nombre: 'Lombricomposta', descripcion: 'Humus enriquecido por lombrices' },
  { id: 'residuosVerdes', emoji: '🌿', nombre: 'Residuos verdes', descripcion: 'Materia orgánica en descomposición' },
  { id: 'carbonActivado', emoji: '🪴', nombre: 'Carbón activado', descripcion: 'Filtra impurezas en sustratos' },
  { id: 'harinaRocas', emoji: '🌱', nombre: 'Harina de rocas', descripcion: 'Aporta minerales traza' },
  { id: 'conchas', emoji: '🐚', nombre: 'Conchas trituradas', descripcion: 'Fuente de calcio (regula pH)' }
];

// Agregar estados necesarios después de los estados existentes
const [searchTerm, setSearchTerm] = useState('');
const [componentesAgregados, setComponentesAgregados] = useState<typeof componentesDisponibles[0][]>([]);

// Agregar función para manejar la adición de componentes especializados
const agregarComponenteEspecializado = (componente: typeof componentesDisponibles[0]) => {
  if (!componentesAgregados.some(c => c.id === componente.id)) {
    setComponentesAgregados(prev => [...prev, componente]);
  }
  setComponentesSeleccionados(prev => [...prev, componente.id]);
  setComponentesSuelo(prev => ({
    ...prev,
    [componente.id]: 0
  }));
  setShowOtroModal(false);
  setSearchTerm('');
};

// Modificar el modal de "Otro" componente
const renderOtroModal = () => {
  if (!showOtroModal) return null;

  const componentesFiltrados = componentesEspecializados.filter(comp => 
    comp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Componentes Especializados</h3>
          <button
            onClick={() => {
              setShowOtroModal(false);
              setSearchTerm('');
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar componente..."
            className="w-full px-3 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-y-auto flex-1 pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {componentesFiltrados.map((componente) => (
              <button
                key={componente.id}
                onClick={() => agregarComponenteEspecializado(componente)}
                className={`
                  flex items-start p-2 rounded-lg border transition-colors text-left
                  ${componentesAgregados.some(c => c.id === componente.id)
                    ? 'bg-green-50 border-green-500'
                    : 'hover:bg-green-50 hover:border-green-300'}
                `}
              >
                <span className="text-xl mr-2 mt-1">{componente.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{componente.nombre}</div>
                  <div className="text-xs text-gray-500 line-clamp-2">{componente.descripcion}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Modificar la lista de componentes disponibles para incluir los componentes agregados
const todosLosComponentes = [...componentesDisponibles, ...componentesAgregados];

  // Cargar strains existentes
  useEffect(() => {
    const cargarStrains = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/cultivos/config-strain?cultivoId=${cultivoId}`);
        if (!response.ok) throw new Error('Error al cargar los datos');
        const { success, data } = await response.json();
        if (success && data) {
          setStrains(data);
        }
      } catch (error) {
        console.error('Error al cargar strains:', error);
      } finally {
        setIsLoading(false);
      }
    };

    cargarStrains();
  }, [cultivoId]);

  const handleStrainSelect = (strain: Strain) => {
    setSelectedStrainIds(prev => {
      if (prev.includes(strain.id)) {
        return prev.filter(id => id !== strain.id);
      } else {
        return [...prev, strain.id];
      }
    });

    // Si es la primera selección, cargar las configuraciones existentes
    if (selectedStrainIds.length === 0 && strain.suelo?.configuracion) {
      setConfiguracionesEtapas(strain.suelo.configuracion);
    }
  };

  const handleSelectAll = () => {
    if (selectedStrainIds.length === strains.length) {
      // Si todas están seleccionadas, deseleccionar todas
      setSelectedStrainIds([]);
    } else {
      // Seleccionar todas
      setSelectedStrainIds(strains.map(strain => strain.id));
    }
  };

  const handleGuardarConfiguracion = async () => {
    if (etapasSeleccionadas.length === 0) {
      mostrarAlerta('Selecciona al menos una etapa');
      return;
    }

    const configuracion = medioSeleccionado === 'sustrato' 
      ? {
          tipo: 'sustrato',
          marca: marcaSustrato,
          cantidad: Number(cantidadSustrato)
        }
      : {
          tipo: 'suelo',
          composicion: componentesSuelo
        };

    // Actualizar configuraciones para todas las etapas seleccionadas
    const newConfiguraciones = { ...configuracionesEtapas };
    etapasSeleccionadas.forEach(etapa => {
      newConfiguraciones[etapa] = configuracion;
    });
    setConfiguracionesEtapas(newConfiguraciones);

    try {
      // Actualizar todas las plantas seleccionadas
      const updatedStrains = strains.map(strain => 
        selectedStrainIds.includes(strain.id)
          ? {
              ...strain,
              suelo: {
                modo: 'porEtapa',
                configuracion: newConfiguraciones
              }
            }
          : strain
      );

      const response = await fetch('/api/cultivos/config-strain', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId,
          strains: updatedStrains
        }),
      });

      if (!response.ok) throw new Error('Error al guardar la configuración');
      
      setStrains(updatedStrains);
      setEtapasSeleccionadas([]); // Limpiar selección después de guardar
      mostrarAlerta('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      mostrarAlerta('Error al guardar la configuración');
    }
  };

  // Función para convertir litros a porcentajes
  const calcularPorcentajes = (litros: Record<string, number>) => {
    const total = Object.values(litros).reduce((sum, val) => sum + val, 0);
    if (total === 0) return {};
    
    return Object.entries(litros).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: Number(((value / total) * 100).toFixed(1))
    }), {});
  };

  // Función para convertir porcentajes a litros
  const calcularLitros = (porcentajes: Record<string, number>, totalL: number) => {
    return Object.entries(porcentajes).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: Number(((value / 100) * totalL).toFixed(1))
    }), {});
  };

  // Función para mostrar alerta
  const mostrarAlerta = (mensaje: string) => {
    setAlertMessage(mensaje);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000); // La alerta desaparecerá después de 3 segundos
  };

    // Función para formatear litros
    const formatearLitros = (valor: number): string => {
      // Si el valor es entero (ejemplo: 10.0), mostrar sin decimales
      if (Number.isInteger(valor)) {
        return `${Math.round(valor)}L`;
      }
      // Si tiene decimales, redondear a un decimal
      return `${valor.toFixed(1)}L`;
    };
  
    // Función para formatear porcentajes
    const formatearPorcentaje = (valor: number): string => {
      // Si el valor es entero (ejemplo: 10.0), mostrar sin decimales
      if (Number.isInteger(valor)) {
        return `${Math.round(valor)}`;
      }
      // Si tiene decimales, redondear a un decimal
      return `${valor.toFixed(1)}`;
    };

  // Función para validar el total de porcentajes
  const validarTotal = (porcentajes: Record<string, number>) => {
    const total = Object.values(porcentajes).reduce((a, b) => a + b, 0);
    return total <= 100;
  };

  // Agregar una nueva función para manejar la eliminación
  const handleEliminarConfiguracion = async (etapaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Eliminar la configuración del estado local
      const newConfiguraciones = { ...configuracionesEtapas };
      delete newConfiguraciones[etapaId];
      setConfiguracionesEtapas(newConfiguraciones);

      // Actualizar las plantas seleccionadas en el backend
      const updatedStrains = strains.map(strain => 
        selectedStrainIds.includes(strain.id)
          ? {
              ...strain,
              suelo: {
                modo: 'porEtapa',
                configuracion: newConfiguraciones
              }
            }
          : strain
      );

      const response = await fetch('/api/cultivos/config-strain', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId,
          strains: updatedStrains
        }),
      });

      if (!response.ok) throw new Error('Error al eliminar la configuración');
      
      setStrains(updatedStrains);
      mostrarAlerta('Configuración eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar la configuración:', error);
      mostrarAlerta('Error al eliminar la configuración');
    }
  };

  const renderComposicionSuelo = () => (
    <div className="space-y-6 relative">
      {/* Alerta flotante */}
      {showAlert && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50 animate-fade-in-out">
          <span className="block sm:inline">{alertMessage}</span>
        </div>
      )}

      <div>
        <h3 className="text-lg font-medium mb-4">Selecciona los componentes del suelo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {todosLosComponentes.map((componente) => (
            <button
              key={componente.id}
              onClick={() => {
                if (componente.id === 'otro') {
                  setShowOtroModal(true);
                } else {
                  setComponentesSeleccionados(prev => 
                    prev.includes(componente.id) 
                      ? prev.filter(id => id !== componente.id)
                      : [...prev, componente.id]
                  );
                }
              }}
              className={`
                p-4 rounded-lg border-2 transition-all text-center
                ${componentesSeleccionados.includes(componente.id) 
                  ? 'border-green-600 bg-green-50' 
                  : 'border-gray-200 hover:border-green-300'}
              `}
            >
              <div className="text-2xl mb-2">{componente.emoji}</div>
              <div className="font-medium">{componente.nombre}</div>
              <div className="text-xs text-gray-600 mt-1">{componente.descripcion}</div>
            </button>
          ))}
        </div>
      </div>

      {componentesSeleccionados.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Ajusta las cantidades</h3>
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-green-600"
                  checked={medidaSeleccionada === 'litros'}
                  onChange={() => setMedidaSeleccionada('litros')}
                />
                <span className="ml-2">Litros</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-green-600"
                  checked={medidaSeleccionada === 'porcentaje'}
                  onChange={() => setMedidaSeleccionada('porcentaje')}
                />
                <span className="ml-2">Porcentaje</span>
              </label>
            </div>
          </div>

          {medidaSeleccionada === 'porcentaje' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Total de litros a preparar
              </label>
              <input
                type="number"
                value={totalLitros}
                onChange={(e) => setTotalLitros(Number(e.target.value))}
                className="mt-1 w-32 rounded-md border-gray-300"
                min="0"
                step="0.1"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {componentesSeleccionados.map((componenteId) => {
              const componente = todosLosComponentes.find(c => c.id === componenteId);
              const valor = medidaSeleccionada === 'litros' 
                ? componentesLitros[componenteId] || 0
                : componentesSuelo[componenteId] || 0;
              
              return (
                <div key={componenteId} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className="text-2xl">{componente?.emoji}</div>
                  <div className="flex-grow">
                    <label className="block text-sm font-medium text-gray-700">
                      {componente?.nombre}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={valor}
                        onChange={(e) => {
                          const newValue = Number(e.target.value);
                          if (medidaSeleccionada === 'porcentaje') {
                            const newPorcentajes = {
                              ...componentesSuelo,
                              [componenteId]: newValue
                            };
                            
                            const total = Object.values(newPorcentajes).reduce((a, b) => a + b, 0);
                            if (total > 100) {
                              mostrarAlerta('El total no puede superar el 100%');
                              return;
                            }
                            
                            setComponentesSuelo(newPorcentajes);
                            if (totalLitros > 0) {
                              setComponentesLitros(calcularLitros(newPorcentajes, totalLitros));
                            }
                          } else {
                            setComponentesLitros(prev => ({
                              ...prev,
                              [componenteId]: newValue
                            }));
                            const newLitros = {
                              ...componentesLitros,
                              [componenteId]: newValue
                            };
                            const porcentajes = calcularPorcentajes(newLitros);
                            setComponentesSuelo(porcentajes);
                            setTotalLitros(Object.values(newLitros).reduce((a, b) => a + b, 0));
                          }
                        }}
                        className="w-24 text-center rounded-md border-gray-300"
                      />
                      <span className="text-sm text-gray-500">
                        {medidaSeleccionada === 'litros' ? 'L' : '%'}
                      </span>
                    </div>
                    {/* Mostrar la conversión */}
                    <div className="text-xs text-gray-500 mt-1">
                      {medidaSeleccionada === 'litros' 
                        ? `${componentesSuelo[componenteId]?.toFixed(1) || 0}%`
                        : `${componentesLitros[componenteId]?.toFixed(1) || 0}L`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Total Indicator con validación visual */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total:</span>
              <div className="text-right">
                <div className={`font-bold text-lg ${
                  medidaSeleccionada === 'porcentaje' && 
                  Object.values(componentesSuelo).reduce((a, b) => a + b, 0) > 100
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                  {medidaSeleccionada === 'litros' 
                    ? `${Object.values(componentesLitros).reduce((a, b) => a + b, 0).toFixed(1)}L`
                    : `${Object.values(componentesSuelo).reduce((a, b) => a + b, 0).toFixed(1)}%`}
                </div>
                <div className="text-xs text-gray-500">
                  {medidaSeleccionada === 'litros' 
                    ? `${Object.values(componentesSuelo).reduce((a, b) => a + b, 0).toFixed(1)}%`
                    : `${totalLitros}L total`}
                </div>
              </div>
            </div>
            
            {/* Barra de progreso con validación visual */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className={`h-2.5 rounded-full transition-all ${
                  medidaSeleccionada === 'porcentaje' && 
                  Object.values(componentesSuelo).reduce((a, b) => a + b, 0) > 100
                    ? 'bg-red-600'
                    : Object.values(componentesSuelo).reduce((a, b) => a + b, 0) === 100
                      ? 'bg-green-600'
                      : 'bg-yellow-400'
                }`}
                style={{ 
                  width: `${Math.min(100, Object.values(componentesSuelo).reduce((a, b) => a + b, 0))}%` 
                }}
              />
            </div>
            
            {/* Mensaje de ayuda */}
            {medidaSeleccionada === 'porcentaje' && (
              <div className={`text-xs mt-2 ${
                Object.values(componentesSuelo).reduce((a, b) => a + b, 0) > 100
                  ? 'text-red-600'
                  : Object.values(componentesSuelo).reduce((a, b) => a + b, 0) === 100
                    ? 'text-green-600'
                    : 'text-yellow-600'
              }`}>
                {Object.values(componentesSuelo).reduce((a, b) => a + b, 0) > 100
                  ? '⚠️ El total supera el 100%'
                  : Object.values(componentesSuelo).reduce((a, b) => a + b, 0) === 100
                    ? '✅ Porcentajes correctos'
                    : `🔸 Falta ${(100 - Object.values(componentesSuelo).reduce((a, b) => a + b, 0)).toFixed(1)}% para completar`}
              </div>
            )}
          </div>
        </div>
      )}

      {renderOtroModal()}
    </div>
  );

  const renderConfiguracionResumen = (config: SueloConfig) => {
    if (config.tipo === 'sustrato') {
      return (
        <div className="text-xs">
          <div className="font-medium">🏭 Sustrato</div>
          <div className="text-gray-600">Marca: {config.marca}</div>
          <div className="text-gray-600">{formatearLitros(config.cantidad)}</div>
        </div>
      );
    } else {
      return (
        <div className="text-xs">
          <div className="font-medium">🌍 Suelo Natural</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(config.composicion || {}).map(([componente, valor]) => {
              const componenteInfo = todosLosComponentes.find(c => c.id === componente);
              if (!valor) return null;
              return (
                <div key={componente} className="bg-gray-100 rounded px-1 py-0.5 flex items-center">
                  <span>{componenteInfo?.emoji}</span>
                  <span className="ml-1">{formatearPorcentaje(valor)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  const renderEtapaCrecimiento = () => (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-4">Etapas de crecimiento</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'propagacion', nombre: 'Propagación', emoji: '🌱', desc: 'Germinación y enraizamiento' },
            { id: 'vegetacion', nombre: 'Vegetación', emoji: '🌿', desc: 'Crecimiento vegetativo' },
            { id: 'floracion', nombre: 'Floración', emoji: '🌺', desc: 'Desarrollo de flores' }
          ].map((etapa) => {
            const isConfigured = configuracionesEtapas[etapa.id];
            const isSelected = etapasSeleccionadas.includes(etapa.id);
            
            return (
              <div
                key={etapa.id}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer text-center transition-all relative
                  ${isSelected ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-300'}
                  ${isConfigured ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                `}
                onClick={() => {
                  setEtapasSeleccionadas(prev => {
                    if (prev.includes(etapa.id)) {
                      return prev.filter(id => id !== etapa.id);
                    } else {
                      return [...prev, etapa.id];
                    }
                  });
                }}
              >
                {/* Indicador de configuración */}
                {isConfigured && (
                  <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-blue-500" />
                )}
                
                <div className="text-2xl mb-2">{etapa.emoji}</div>
                <div className="font-medium">{etapa.nombre}</div>
                <div className="text-xs text-gray-600 mt-1">{etapa.desc}</div>
                
                {isConfigured && (
                  <div className="mt-3 border-t pt-2">
                    {renderConfiguracionResumen(configuracionesEtapas[etapa.id])}
                    <div className="flex items-center justify-center space-x-2 mt-2">
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const config = configuracionesEtapas[etapa.id];
                          setMedioSeleccionado(config.tipo);
                          if (config.tipo === 'sustrato') {
                            setMarcaSustrato(config.marca || '');
                            setCantidadSustrato(config.cantidad?.toString() || '');
                          } else {
                            setComponentesSuelo(config.composicion || componentesSuelo);
                            setComponentesSeleccionados(
                              Object.entries(config.composicion || {})
                                .filter(([_, valor]) => valor > 0)
                                .map(([componente]) => componente)
                            );
                          }
                        }}
                      >
                        Ver/Editar
                      </button>
                      <button
                        className="text-xs text-red-600 hover:text-red-800 underline"
                        onClick={(e) => handleEliminarConfiguracion(etapa.id, e)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Resumen de etapas seleccionadas */}
        {etapasSeleccionadas.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <div className="font-medium mb-1">Configurando para:</div>
              <div className="flex flex-wrap gap-2">
                {etapasSeleccionadas.map(id => {
                  const etapa = [
                    { id: 'propagacion', nombre: 'Propagación', emoji: '🌱' },
                    { id: 'vegetacion', nombre: 'Vegetación', emoji: '🌿' },
                    { id: 'floracion', nombre: 'Floración', emoji: '🌺' }
                  ].find(e => e.id === id);
                  return (
                    <div key={id} className="bg-white px-2 py-1 rounded-full border flex items-center">
                      <span>{etapa?.emoji}</span>
                      <span className="ml-1">{etapa?.nombre}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  return (
    <div className="mt-8 flex flex-col lg:flex-row gap-6">
      {/* Panel de Strains */}
      <div className="w-full lg:w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Plantas</h3>
          <button
            onClick={handleSelectAll}
            className={`px-3 py-1 rounded-md text-sm ${
              selectedStrainIds.length === strains.length
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {selectedStrainIds.length === strains.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
          </button>
        </div>
        
        {/* Contador de selección */}
        {selectedStrainIds.length > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            {selectedStrainIds.length} planta{selectedStrainIds.length !== 1 ? 's' : ''} seleccionada{selectedStrainIds.length !== 1 ? 's' : ''}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {strains.map((strain) => (
            <div
              key={strain.id}
              onClick={() => handleStrainSelect(strain)}
              className={`
                p-2 sm:p-4 rounded-lg border-2 cursor-pointer transition-all relative
                ${selectedStrainIds.includes(strain.id) ? 'border-green-600 bg-green-50' : 'border-gray-200'}
                ${strain.nombre ? 'bg-white' : 'bg-gray-50'}
              `}
              style={{ backgroundColor: strain.color }}
            >
              {/* Checkbox de selección */}
              <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                <input
                  type="checkbox"
                  checked={selectedStrainIds.includes(strain.id)}
                  onChange={() => handleStrainSelect(strain)}
                  className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 rounded border-gray-300"
                  onClick={e => e.stopPropagation()}
                />
              </div>

              <div className="text-center">
                <div className="text-xl sm:text-3xl mb-1 sm:mb-2">🌱</div>
                <div className="text-xs sm:text-xs font-medium truncate">
                  {strain.nombre || `Planta ${strain.id + 1}`}
                </div>
                {strain.suelo && (
                  <div className="text-xs mt-1 bg-white bg-opacity-80 rounded px-1 py-0.5">
                    {strain.suelo.tipo === 'sustrato' ? '🏭' : '🌍'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel de Configuración */}
      <div className="w-full lg:w-2/3">
        {selectedStrainIds.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">
              Configurar suelo para {selectedStrainIds.length} planta{selectedStrainIds.length !== 1 ? 's' : ''}
            </h2>

            {renderEtapaCrecimiento()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  medioSeleccionado === 'suelo' 
                    ? 'border-green-600 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300'
                }`}
                onClick={() => setMedioSeleccionado('suelo')}
              >
                <div className="flex items-center mb-3">
                  <input
                    type="radio"
                    checked={medioSeleccionado === 'suelo'}
                    onChange={() => setMedioSeleccionado('suelo')}
                    className="h-4 w-4 text-green-600"
                  />
                  <span className="ml-2 text-lg font-medium">Suelo Natural</span>
                </div>
                <p className="text-gray-600 text-sm">
                  Es la capa natural de la Tierra que contiene minerales, materia orgánica, 
                  microorganismos y nutrientes esenciales. Funciona como un ecosistema vivo 
                  que interactúa con las raíces de las plantas.
                </p>
                <div className="mt-3 text-sm text-green-700">
                  <span className="font-medium">Ideal para:</span>
                  <ul className="list-disc ml-5 mt-1">
                    <li>Cultivos orgánicos</li>
                    <li>Jardines naturales</li>
                    <li>Agricultura sustentable</li>
                  </ul>
                </div>
              </div>

              <div 
                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  medioSeleccionado === 'sustrato' 
                    ? 'border-green-600 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300'
                }`}
                onClick={() => setMedioSeleccionado('sustrato')}
              >
                <div className="flex items-center mb-3">
                  <input
                    type="radio"
                    checked={medioSeleccionado === 'sustrato'}
                    onChange={() => setMedioSeleccionado('sustrato')}
                    className="h-4 w-4 text-green-600"
                  />
                  <span className="ml-2 text-lg font-medium">Sustrato</span>
                </div>
                <p className="text-gray-600 text-sm">
                  Medio de cultivo diseñado específicamente para optimizar el crecimiento 
                  de las plantas. Ofrece mejor control sobre propiedades como drenaje, 
                  aireación y retención de agua.
                </p>
                <div className="mt-3 text-sm text-green-700">
                  <span className="font-medium">Ideal para:</span>
                  <ul className="list-disc ml-5 mt-1">
                    <li>Cultivos tradicionales</li>
                    <li>Hidroponía</li>
                    <li>Control preciso de nutrientes</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {medioSeleccionado === 'sustrato' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    🏭 Marca del sustrato
                  </label>
                  <input
                    type="text"
                    value={marcaSustrato}
                    onChange={(e) => setMarcaSustrato(e.target.value)}
                    placeholder="Ej: BioBizz, Canna, etc."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 hover:border-green-400 transition-colors"
                  />
                  <label className="block text-sm font-medium text-gray-700 mt-4">
                    📏 Cantidad (litros)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={cantidadSustrato}
                      onChange={(e) => setCantidadSustrato(e.target.value)}
                      placeholder="Ej: 50"
                      min="0"
                      step="0.1"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 hover:border-green-400 transition-colors pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      L
                    </span>
                  </div>
                </div>
              ) : (
                renderComposicionSuelo()
              )}

              <div className="text-center py-4">
                <button
                  onClick={handleGuardarConfiguracion}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Guardar Configuración para {selectedStrainIds.length} planta{selectedStrainIds.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Selecciona una o más plantas para configurar su medio de cultivo
          </div>
        )}
      </div>
    </div>
  );
}

export default SueloPlanner;