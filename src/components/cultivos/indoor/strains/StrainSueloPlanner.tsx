import { useState } from 'react';

interface StrainSueloPlannerProps {
  cultivoId: string;
  user_id: string;
  strainData: {
    id: string;
    nombre: string;
    suelo?: {
      modo?: 'unificado' | 'porEtapa';
      configuracion?: {
        propagacion?: SueloConfig;
        vegetacion?: SueloConfig;
        floracion?: SueloConfig;
        unificado?: SueloConfig;
      };
    };
  };
}

interface SueloConfig {
  tipo: 'suelo' | 'sustrato';
  marca?: string;
  cantidad?: number;
  composicion?: Record<string, number>;
}

type EtapaId = 'propagacion' | 'vegetacion' | 'floracion' | 'unificado';

// Agregar la interfaz para los componentes
interface Componente {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string;
}

function StrainSueloPlanner({ cultivoId, user_id, strainData }: StrainSueloPlannerProps) {
  const [medioSeleccionado, setMedioSeleccionado] = useState<'suelo' | 'sustrato'>('suelo');
  const [marcaSustrato, setMarcaSustrato] = useState('');
  const [cantidadSustrato, setCantidadSustrato] = useState('');
  const [componentesSuelo, setComponentesSuelo] = useState<Record<string, number>>({});
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<EtapaId | null>(null);
  const [configuracionesEtapas, setConfiguracionesEtapas] = useState<Partial<Record<EtapaId, SueloConfig>>>(
    strainData.suelo?.configuracion || {}
  );
  
  // Nuevos estados para el manejo de litros y porcentajes
  const [medidaSeleccionada, setMedidaSeleccionada] = useState<'litros' | 'porcentaje'>('litros');
  // Mantener el último valor de litros usado
  const [ultimoTotalLitros, setUltimoTotalLitros] = useState<number>(0);
  const [totalLitros, setTotalLitros] = useState<number>(0);
  const [componentesLitros, setComponentesLitros] = useState<Record<string, number>>({});
  const [componentesSeleccionados, setComponentesSeleccionados] = useState<string[]>([]);
  const [showOtroModal, setShowOtroModal] = useState(false);
  const [otroComponente, setOtroComponente] = useState('');
  // Agregar el nuevo estado para la búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  // Nuevo estado para mantener los componentes agregados
  const [componentesAgregados, setComponentesAgregados] = useState<Componente[]>([]);

  // Lista base de componentes disponibles
  const componentesDisponiblesBase: Componente[] = [
    { id: 'tierra', nombre: 'Tierra', emoji: '🌍', descripcion: 'Base principal del sustrato' },
    { id: 'humus', nombre: 'Humus', emoji: '🐛', descripcion: 'Rico en nutrientes y microorganismos' },
    { id: 'compost', nombre: 'Compost', emoji: '🍂', descripcion: 'Materia orgánica descompuesta' },
    { id: 'fibraCoco', nombre: 'Fibra de Coco', emoji: '🥥', descripcion: 'Mejora retención de agua' },
    { id: 'perlita', nombre: 'Perlita', emoji: '⚪', descripcion: 'Mejora aireación' },
    { id: 'vermiculita', nombre: 'Vermiculita', emoji: '🔘', descripcion: 'Retiene nutrientes y agua' },
    { id: 'bokashi', nombre: 'Bokashi', emoji: '🍱', descripcion: 'Aporte de nutrientes fermentados y microorganismos' },
    { id: 'turba', nombre: 'Turba', emoji: '🟤', descripcion: 'Mejora la retención de humedad' },
    { id: 'ceniza', nombre: 'Ceniza', emoji: '🔥', descripcion: 'Aporta minerales y regula pH' },
    { id: 'guano', nombre: 'Guano', emoji: '🦇', descripcion: 'Fuente natural de nitrógeno y fósforo' },
    { id: 'biochar', nombre: 'Biochar', emoji: '♨️', descripcion: 'Mejora la estructura del suelo y la retención de carbono' },
    { id: 'otro', nombre: 'Otro', emoji: '➕', descripcion: 'Agregar componente especializado' },
  ];

  // Combinar componentes base con los agregados
  const componentesDisponibles: Componente[] = [...componentesDisponiblesBase, ...componentesAgregados];

  // Agregar la lista de componentes especializados
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

  // Función para cargar la configuración de una etapa
  const cargarConfiguracionEtapa = (etapaId: EtapaId) => {
    const config = configuracionesEtapas[etapaId];
    if (config) {
      setMedioSeleccionado(config.tipo);
      if (config.tipo === 'sustrato') {
        setMarcaSustrato(config.marca || '');
        setCantidadSustrato(config.cantidad?.toString() || '');
        setComponentesSuelo({});
        setComponentesLitros({});
        // Si hay una cantidad en el sustrato, actualizarla como último total
        if (config.cantidad) {
          setUltimoTotalLitros(config.cantidad);
        }
      } else {
        setMarcaSustrato('');
        setCantidadSustrato('');
        const composicion = config.composicion || {};
        setComponentesSuelo(composicion);
        setComponentesSeleccionados(Object.keys(composicion).filter(key => composicion[key] > 0));
        
        // Calcular el total de litros de la configuración guardada
        const totalGuardado = Object.values(config.composicion || {}).reduce((sum, value) => sum + value, 0);
        if (totalGuardado > 0) {
          setTotalLitros(totalGuardado);
          setUltimoTotalLitros(totalGuardado);
        } else {
          // Si no hay total guardado, usar el último valor conocido
          setTotalLitros(ultimoTotalLitros);
        }
        
        if (medidaSeleccionada === 'litros' && ultimoTotalLitros > 0) {
          setComponentesLitros(calcularLitros(composicion, ultimoTotalLitros));
        }
      }
    } else {
      // Al limpiar campos, mantener el último total de litros conocido
      limpiarCampos(false);
      setTotalLitros(ultimoTotalLitros);
    }
  };

  // Función para limpiar los campos
  const limpiarCampos = (resetearTotal: boolean = true) => {
    setMedioSeleccionado('suelo');
    setMarcaSustrato('');
    setCantidadSustrato('');
    setComponentesSuelo({});
    setComponentesLitros({});
    setComponentesSeleccionados([]);
    if (resetearTotal) {
      setTotalLitros(0);
    }
  };

  // Modificar el manejo del cambio de total de litros
  const handleTotalLitrosChange = (newTotal: number) => {
    setTotalLitros(newTotal);
    setUltimoTotalLitros(newTotal); // Guardar el último valor usado
    if (newTotal > 0 && Object.keys(componentesSuelo).length > 0) {
      setComponentesLitros(calcularLitros(componentesSuelo, newTotal));
    }
  };

  const handleGuardarConfiguracion = async () => {
    if (!etapaSeleccionada) {
      alert('Selecciona una etapa');
      return;
    }

    try {
      // Primero obtenemos los strains actuales
      const response = await fetch(`/api/cultivos/config-strain?cultivoId=${cultivoId}`);
      if (!response.ok) throw new Error('Error al obtener los datos');
      const { success, data: currentStrains } = await response.json();
      
      if (!success) throw new Error('Error al obtener los datos');

      // Creamos la nueva configuración
      const configuracion: SueloConfig = medioSeleccionado === 'sustrato' 
        ? {
            tipo: 'sustrato',
            marca: marcaSustrato,
            cantidad: Number(cantidadSustrato)
          }
        : {
            tipo: 'suelo',
            composicion: componentesSuelo
          };

      // Actualizamos la configuración para la etapa seleccionada
      const newConfiguraciones = { 
        ...configuracionesEtapas,
        [etapaSeleccionada]: configuracion
      };

      // Actualizamos el strain específico con la nueva configuración
      const updatedStrains = currentStrains.map((strain: any) => 
        strain.id.toString() === strainData.id.toString()
          ? {
              ...strain,
              suelo: {
                modo: 'porEtapa',
                configuracion: newConfiguraciones
              }
            }
          : strain
      );

      // Enviamos la actualización
      const updateResponse = await fetch('/api/cultivos/config-strain', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId,
          strains: updatedStrains
        }),
      });

      if (!updateResponse.ok) throw new Error('Error al guardar la configuración');
      
      setConfiguracionesEtapas(newConfiguraciones);
      setEtapaSeleccionada(null);
      limpiarCampos();
      alert('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar la configuración');
    }
  };

  const handleEliminarConfiguracion = async (etapaId: EtapaId, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Primero obtenemos los strains actuales
      const response = await fetch(`/api/cultivos/config-strain?cultivoId=${cultivoId}`);
      if (!response.ok) throw new Error('Error al obtener los datos');
      const { success, data: currentStrains } = await response.json();
      
      if (!success) throw new Error('Error al obtener los datos');

      // Eliminamos la configuración de la etapa
      const newConfiguraciones = { ...configuracionesEtapas };
      delete newConfiguraciones[etapaId];

      // Actualizamos el strain específico
      const updatedStrains = currentStrains.map((strain: any) => 
        strain.id.toString() === strainData.id.toString()
          ? {
              ...strain,
              suelo: {
                modo: 'porEtapa',
                configuracion: newConfiguraciones
              }
            }
          : strain
      );

      // Enviamos la actualización
      const updateResponse = await fetch('/api/cultivos/config-strain', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId,
          strains: updatedStrains
        }),
      });

      if (!updateResponse.ok) throw new Error('Error al eliminar la configuración');
      
      setConfiguracionesEtapas(newConfiguraciones);
      alert('Configuración eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar la configuración');
    }
  };

  const renderConfiguracionResumen = (config: SueloConfig) => {
    if (config.tipo === 'sustrato') {
      return (
        <div className="text-xs">
          <div className="font-medium">🏭 Sustrato</div>
          <div className="text-gray-600">Marca: {config.marca}</div>
          <div className="text-gray-600">{config.cantidad ? formatearLitros(config.cantidad) : '0L'}</div>
        </div>
      );
    } else {
      const totalLitros = config.composicion ? 
        Object.values(config.composicion).reduce((sum, val) => sum + val, 0) : 0;

      return (
        <div className="text-xs">
          <div className="font-medium">🌍 Suelo Natural</div>
          <div className="text-gray-600 mb-1">Total: {formatearLitros(totalLitros)}</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(config.composicion || {}).map(([componente, valor]) => {
              const componenteInfo = componentesDisponibles.find(c => c.id === componente);
              if (!valor) return null;
              const litros = (valor / 100) * totalLitros;
              return (
                <div key={componente} className="bg-gray-100 rounded px-2 py-1 flex items-center">
                  <span>{componenteInfo?.emoji}</span>
                  <span className="ml-1">{formatearLitros(litros)} ({formatearPorcentaje(valor)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  // Agregar un nuevo componente para mostrar el resumen de litros
  const LitrosSummary = () => {
    if (!etapaSeleccionada || medioSeleccionado !== 'suelo') return null;

    const totalL = Number(
      Object.values(componentesLitros)
        .reduce((a, b) => a + b, 0)
        .toFixed(1)
    );

    return (
      <div className="mt-4 bg-white border rounded-lg p-4 shadow-sm">
        <h4 className="text-sm font-medium mb-2">Resumen de Litros</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total a preparar:</span>
            <span className="font-medium">{formatearLitros(totalL)}</span>
          </div>
          <div className="h-px bg-gray-200 my-2"></div>
          <div className="space-y-1">
            {componentesSeleccionados.map(componenteId => {
              const componente = componentesDisponibles.find(c => c.id === componenteId);
              const litros = Number((componentesLitros[componenteId] || 0).toFixed(1));
              const porcentaje = Number((componentesSuelo[componenteId] || 0).toFixed(1));

              return (
                <div key={componenteId} className="flex justify-between items-center text-sm">
                  <div className="flex items-center">
                    <span className="mr-2">{componente?.emoji}</span>
                    <span>{componente?.nombre}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatearLitros(litros)}</span>
                    <span className="text-gray-500 text-xs ml-1">({formatearPorcentaje(porcentaje)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Modificar la función handleComponenteSelect
  const handleComponenteSelect = (componenteId: string) => {
    if (componenteId === 'otro') {
      setShowOtroModal(true);
      return;
    }

    setComponentesSeleccionados(prev => {
      const newSeleccionados = prev.includes(componenteId)
        ? prev.filter(id => id !== componenteId)
        : [...prev, componenteId];

      // Si se está deseleccionando, eliminar los valores
      if (!newSeleccionados.includes(componenteId)) {
        const newComponentesSuelo = { ...componentesSuelo };
        const newComponentesLitros = { ...componentesLitros };
        delete newComponentesSuelo[componenteId];
        delete newComponentesLitros[componenteId];
        setComponentesSuelo(newComponentesSuelo);
        setComponentesLitros(newComponentesLitros);
      } else {
        // Si se está seleccionando, inicializar con valor 0
        setComponentesSuelo(prev => ({ ...prev, [componenteId]: 0 }));
        setComponentesLitros(prev => ({ ...prev, [componenteId]: 0 }));
      }

      return newSeleccionados;
    });
  };

  // Función para agregar un componente especializado
  const agregarComponenteEspecializado = (componente: Componente) => {
    // Verificar si el componente ya está agregado
    if (!componentesAgregados.some((c: Componente) => c.id === componente.id)) {
      setComponentesAgregados((prev: Componente[]) => [...prev, componente]);
    }
    handleComponenteSelect(componente.id);
  };

  // Modificar la función handleComponenteValueChange
  const handleComponenteValueChange = (componenteId: string, newValue: number) => {
    if (medidaSeleccionada === 'porcentaje') {
      // Calcular el total actual sin el componente que estamos modificando
      const totalActual = Object.entries(componentesSuelo)
        .reduce((sum, [id, value]) => id !== componenteId ? sum + value : sum, 0);

      // Verificar que el nuevo total no exceda 100%
      if (totalActual + newValue > 100) {
        alert('El total no puede superar el 100%');
        return;
      }

      setComponentesSuelo(prev => ({
        ...prev,
        [componenteId]: Number(newValue.toFixed(1))
      }));

      // Si hay un total de litros definido, actualizar también los litros
      if (totalLitros > 0) {
        const newLitros = (newValue / 100) * totalLitros;
        setComponentesLitros(prev => ({
          ...prev,
          [componenteId]: Number(newLitros.toFixed(1))
        }));
      }
    } else {
      // Modo litros
      setComponentesLitros(prev => {
        const newComponentesLitros = {
          ...prev,
          [componenteId]: Number(newValue.toFixed(1))
        };
        
        // Calcular el nuevo total de litros sumando todos los componentes
        const nuevoTotalLitros = Number(
          Object.values(newComponentesLitros)
            .reduce((sum, value) => sum + value, 0)
            .toFixed(1)
        );
        
        // Actualizar el total de litros
        setTotalLitros(nuevoTotalLitros);
        setUltimoTotalLitros(nuevoTotalLitros);
        
        // Actualizar los porcentajes basados en el nuevo total
        if (nuevoTotalLitros > 0) {
          const newPorcentajes = Object.entries(newComponentesLitros).reduce((acc, [id, value]) => ({
            ...acc,
            [id]: Number(((value / nuevoTotalLitros) * 100).toFixed(1))
          }), {});
          setComponentesSuelo(newPorcentajes);
        }
        
        return newComponentesLitros;
      });
    }
  };

  // Modificar el renderizado de los componentes disponibles
  const renderComponentesDisponibles = () => (
    <div>
      <h3 className="text-lg font-medium mb-4">Selecciona los componentes del suelo</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {componentesDisponibles.map((componente) => (
          <button
            key={componente.id}
            onClick={() => handleComponenteSelect(componente.id)}
            className={`
              p-4 rounded-lg border-2 transition-all text-center relative
              ${componentesSeleccionados.includes(componente.id) 
                ? 'border-green-600 bg-green-50' 
                : 'border-gray-200 hover:border-green-300'}
            `}
          >
            <div className="text-2xl mb-2">{componente.emoji}</div>
            <div className="font-medium">{componente.nombre}</div>
            <div className="text-xs text-gray-600 mt-1">{componente.descripcion}</div>
            
            {componentesSeleccionados.includes(componente.id) && (
              <div className="mt-2 px-2">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={medidaSeleccionada === 'litros' 
                      ? (componentesLitros[componente.id] || 0)
                      : (componentesSuelo[componente.id] || 0)
                    }
                    onChange={(e) => handleComponenteValueChange(componente.id, Number(e.target.value))}
                    className="w-full text-center rounded-md border-gray-300 text-sm pr-8"
                    placeholder="0"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    {medidaSeleccionada === 'litros' ? 'L' : '%'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {medidaSeleccionada === 'litros' 
                    ? `${Number((componentesSuelo[componente.id] || 0)).toFixed(1)}%`
                    : formatearLitros(componentesLitros[componente.id] || 0)
                  }
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

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
                  onClick={() => {
                    agregarComponenteEspecializado(componente);
                    setShowOtroModal(false);
                    setSearchTerm('');
                  }}
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Configuración del Medio de Cultivo</h3>

      {/* Etapas de crecimiento */}
      <div className="mb-6">
        <h4 className="text-lg font-medium mb-4">Etapas de crecimiento</h4>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'propagacion' as const, nombre: 'Propagación', emoji: '🌱', desc: 'Germinación y enraizamiento' },
            { id: 'vegetacion' as const, nombre: 'Vegetación', emoji: '🌿', desc: 'Crecimiento vegetativo' },
            { id: 'floracion' as const, nombre: 'Floración', emoji: '🌺', desc: 'Desarrollo de flores' }
          ].map((etapa) => {
            const isConfigured = configuracionesEtapas[etapa.id];
            const isSelected = etapaSeleccionada === etapa.id;
            
            return (
              <div
                key={etapa.id}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer text-center transition-all relative
                  ${isSelected ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-300'}
                  ${isConfigured ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                `}
                onClick={() => {
                  if (isSelected) {
                    setEtapaSeleccionada(null);
                    limpiarCampos();
                  } else {
                    setEtapaSeleccionada(etapa.id);
                    cargarConfiguracionEtapa(etapa.id);
                  }
                }}
              >
                {isConfigured && (
                  <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-blue-500" />
                )}
                
                <div className="text-2xl mb-2">{etapa.emoji}</div>
                <div className="font-medium">{etapa.nombre}</div>
                <div className="text-xs text-gray-600 mt-1">{etapa.desc}</div>
                
                {isConfigured && (
                  <div className="mt-3 border-t pt-2">
                    {renderConfiguracionResumen(configuracionesEtapas[etapa.id] as SueloConfig)}
                    <div className="flex items-center justify-center space-x-2 mt-2">
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
      </div>

      {etapaSeleccionada && (
        <>
          {/* Selector de tipo de medio */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              className={`p-4 rounded-lg border-2 transition-all ${
                medioSeleccionado === 'suelo' ? 'border-green-600 bg-green-50' : 'border-gray-200'
              }`}
              onClick={() => setMedioSeleccionado('suelo')}
            >
              <div className="text-xl mb-2">🌍</div>
              <div className="font-medium">Suelo Natural</div>
            </button>

            <button
              className={`p-4 rounded-lg border-2 transition-all ${
                medioSeleccionado === 'sustrato' ? 'border-green-600 bg-green-50' : 'border-gray-200'
              }`}
              onClick={() => setMedioSeleccionado('sustrato')}
            >
              <div className="text-xl mb-2">🏭</div>
              <div className="font-medium">Sustrato</div>
            </button>
          </div>

          {/* Configuración según el tipo seleccionado */}
          {medioSeleccionado === 'sustrato' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca del sustrato
                </label>
                <input
                  type="text"
                  value={marcaSustrato}
                  onChange={(e) => setMarcaSustrato(e.target.value)}
                  className="w-full rounded-md border-gray-300"
                  placeholder="Ej: BioBizz, Canna, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad (litros)
                </label>
                <input
                  type="number"
                  value={cantidadSustrato}
                  onChange={(e) => setCantidadSustrato(e.target.value)}
                  className="w-full rounded-md border-gray-300"
                  placeholder="Ej: 50"
                  min="0"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Configuración de cantidades */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h4 className="text-lg font-medium mb-4">Configuración de Cantidades</h4>
                
                <div className="space-y-4">
                  {/* Selector de tipo de medida */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Tipo de medida:</span>
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

                  {/* Input de total de litros */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total de litros a preparar
                    </label>
                    <div className="relative w-40">
                      <input
                        type="number"
                        value={totalLitros}
                        readOnly={medidaSeleccionada === 'litros'} // Hacer el input de solo lectura en modo litros
                        onChange={(e) => handleTotalLitrosChange(Number(e.target.value))}
                        className={`w-full rounded-md border-gray-300 pr-8 ${
                          medidaSeleccionada === 'litros' ? 'bg-gray-100' : ''
                        }`}
                        min="0"
                        step="0.1"
                        placeholder={ultimoTotalLitros > 0 ? ultimoTotalLitros.toString() : "0"}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">L</span>
                    </div>
                    {medidaSeleccionada === 'litros' && (
                      <p className="text-xs text-gray-500 mt-1">
                        El total se calcula automáticamente según los valores ingresados
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Renderizar componentes disponibles */}
              {totalLitros > 0 && (
                <>
                  {renderComponentesDisponibles()}
                  {componentesSeleccionados.length > 0 && <LitrosSummary />}
                </>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={handleGuardarConfiguracion}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Guardar Configuración
            </button>
          </div>
        </>
      )}

      {renderOtroModal()}
    </div>
  );
}

export default StrainSueloPlanner;