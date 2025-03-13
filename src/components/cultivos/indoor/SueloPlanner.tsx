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

interface Strain {
  id: number;
  color?: string;
  nombre: string;
  selected: false;
  nombreBase?: string;
  suelo?: {
    tipo: 'suelo' | 'sustrato';
    marca?: string;
    cantidad?: number;
    composicion?: ComposicionSuelo;
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

  const componentesDisponibles = [
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
    { id: 'otro', nombre: 'Otro', emoji: '➕', descripcion: 'Agregar componente personalizado' },
];


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

    // Si es la primera selección, cargar la configuración de esa planta
    if (selectedStrainIds.length === 0) {
      if (strain.suelo) {
        setMedioSeleccionado(strain.suelo.tipo);
        if (strain.suelo.tipo === 'sustrato') {
          setMarcaSustrato(strain.suelo.marca || '');
          setCantidadSustrato(strain.suelo.cantidad?.toString() || '');
        } else {
          setComponentesSuelo(strain.suelo.composicion || componentesSuelo);
        }
      }
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
    if (selectedStrainIds.length === 0) return;

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

    try {
      // Actualizar todas las plantas seleccionadas
      const updatedStrains = strains.map(strain => 
        selectedStrainIds.includes(strain.id)
          ? { ...strain, suelo: configuracion }
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
      // Limpiar selección después de guardar
      setSelectedStrainIds([]);
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
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

  // Función para validar el total de porcentajes
  const validarTotal = (porcentajes: Record<string, number>) => {
    const total = Object.values(porcentajes).reduce((a, b) => a + b, 0);
    return total <= 100;
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
          {componentesDisponibles.map((componente) => (
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
              const componente = componentesDisponibles.find(c => c.id === componenteId);
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

      {/* Modal para "Otro" componente */}
      {showOtroModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Agregar otro componente</h3>
            <input
              type="text"
              placeholder="Nombre del componente"
              value={otroComponente}
              onChange={(e) => setOtroComponente(e.target.value)}
              className="w-full rounded-md border-gray-300 mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOtroModal(false);
                  setOtroComponente('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (otroComponente.trim()) {
                    setComponentesSeleccionados(prev => [...prev, 'otro']);
                    setComponentesSuelo(prev => ({
                      ...prev,
                      otro: { nombre: otroComponente, porcentaje: 0 }
                    }));
                  }
                  setShowOtroModal(false);
                  setOtroComponente('');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
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

        <div className="grid grid-cols-3 gap-2">
          {strains.map((strain) => (
            <div
              key={strain.id}
              onClick={() => handleStrainSelect(strain)}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all relative
                ${selectedStrainIds.includes(strain.id) ? 'border-green-600 bg-green-50' : 'border-gray-200'}
                ${strain.nombre ? 'bg-white' : 'bg-gray-50'}
              `}
              style={{ backgroundColor: strain.color }}
            >
              {/* Checkbox de selección */}
              <div className="absolute top-2 right-2">
                <input
                  type="checkbox"
                  checked={selectedStrainIds.includes(strain.id)}
                  onChange={() => handleStrainSelect(strain)}
                  className="h-4 w-4 text-green-600 rounded border-gray-300"
                  onClick={e => e.stopPropagation()}
                />
              </div>

              <div className="text-center">
                <div className="text-3xl mb-2">🌱</div>
                <div className="text-sm font-medium">
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
                    Marca del sustrato
                  </label>
                  <input
                    type="text"
                    value={marcaSustrato}
                    onChange={(e) => setMarcaSustrato(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
                  <label className="block text-sm font-medium text-gray-700 mt-4">
                    Cantidad (litros)
                  </label>
                  <input
                    type="number"
                    value={cantidadSustrato}
                    onChange={(e) => setCantidadSustrato(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  />
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