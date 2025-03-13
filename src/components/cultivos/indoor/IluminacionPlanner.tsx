import { useState, useEffect } from 'react';

interface ConfiguracionCultivo {
  numPlantas: number;
  maxCapacity: number;
  espacioAncho: number;
  espacioLargo: number;
  maceteroAncho: number;
  maceteroLargo: number;
}

interface Luminaria {
  id: number;
  tipo: 'LED' | 'HPS' | 'MH' | 'CFL';
  potencia: number;
  ancho: number;  // Ancho de la luminaria en cm
  largo: number;  // Largo de la luminaria en cm
  altura: number; // Altura respecto a las plantas
  posicionX: number;
  posicionY: number;
  selected: boolean;
}

interface TamañoLuminaria {
  watt: number;
  ancho: number;
  largo: number;
}

interface EspacioCultivo {
  espacio: string;
  minWatt: number;
  maxWatt: number;
}

interface TipoLuminaria {
  tipo: 'LED' | 'HPS' | 'MH' | 'CFL';
  nombre: string;
  tamaños: TamañoLuminaria[];
  espaciosCultivo: EspacioCultivo[];
}

interface ResultadoValidacion {
  alertas: string[];
  optimizado: boolean;
  wattsRestantes: {
    tipo: string;
    actual: number;
    maximo: number;
    restante: number;
  }[];
}

interface Props {
  cultivoId: string;
  ambiente?: any;
  config?: ConfiguracionCultivo;
}

const TIPOS_LUMINARIA: TipoLuminaria[] = [
    {
      tipo: 'LED',
      nombre: 'LED Panel',
      tamaños: [
        { watt: 50, ancho: 30, largo: 30 },
        { watt: 100, ancho: 40, largo: 40 },
        { watt: 200, ancho: 60, largo: 60 },
        { watt: 320, ancho: 80, largo: 80 }
      ],
      espaciosCultivo: [
        { espacio: '60x60', minWatt: 100, maxWatt: 200 },
        { espacio: '80x80', minWatt: 150, maxWatt: 600 },
        { espacio: '100x100', minWatt: 240, maxWatt: 1000 },
        { espacio: '120x120', minWatt: 320, maxWatt: 1500 },
        { espacio: '120x240', minWatt: 600, maxWatt: 3000 },
        { espacio: '240x240', minWatt: 960, maxWatt: 6000 }
      ]
    },
    {
      tipo: 'HPS',
      nombre: 'HPS (Sodio Alta Presión)',
      tamaños: [
        { watt: 250, ancho: 40, largo: 40 },
        { watt: 400, ancho: 50, largo: 50 },
        { watt: 600, ancho: 70, largo: 70 }
      ],
      espaciosCultivo: [
        { espacio: '60x60', minWatt: 600, maxWatt: 600 },
        { espacio: '80x80', minWatt: 800, maxWatt: 1000 },
        { espacio: '100x100', minWatt: 1200, maxWatt: 1500 },
        { espacio: '120x120', minWatt: 2000, maxWatt: 2500 },
        { espacio: '120x240', minWatt: 4000, maxWatt: 5000 },
        { espacio: '240x240', minWatt: 8000, maxWatt: 10000 }
      ]
    },
    {
      tipo: 'MH',
      nombre: 'MH (Haluro Metálico)',
      tamaños: [
        { watt: 250, ancho: 40, largo: 40 },
        { watt: 400, ancho: 50, largo: 50 },
        { watt: 600, ancho: 70, largo: 70 }
      ],
      espaciosCultivo: [
        { espacio: '60x60', minWatt: 600, maxWatt: 600 },
        { espacio: '80x80', minWatt: 800, maxWatt: 1000 },
        { espacio: '100x100', minWatt: 1200, maxWatt: 1500 },
        { espacio: '120x120', minWatt: 2000, maxWatt: 2500 },
        { espacio: '120x240', minWatt: 4000, maxWatt: 5000 },
        { espacio: '240x240', minWatt: 8000, maxWatt: 10000 }
      ]
    },
    {
      tipo: 'CFL',
      nombre: 'CFL (Fluorescente Compacta)',
      tamaños: [
        { watt: 50, ancho: 20, largo: 20 },
        { watt: 100, ancho: 30, largo: 30 },
        { watt: 150, ancho: 40, largo: 40 }
      ],
      espaciosCultivo: [
        { espacio: '60x60', minWatt: 600, maxWatt: 600 },
        { espacio: '80x80', minWatt: 800, maxWatt: 1000 },
        { espacio: '100x100', minWatt: 1200, maxWatt: 1500 },
        { espacio: '120x120', minWatt: 2000, maxWatt: 2500 },
        { espacio: '120x240', minWatt: 4000, maxWatt: 5000 },
        { espacio: '240x240', minWatt: 8000, maxWatt: 10000 }
      ]
    }
  ];

function IluminacionPlanner({ cultivoId, ambiente, config: initialConfig }: Props) {
  const [config, setConfig] = useState<ConfiguracionCultivo | null>(initialConfig || null);
  const [luminarias, setLuminarias] = useState<Luminaria[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editandoLuminaria, setEditandoLuminaria] = useState<Luminaria | null>(null);
  const [nuevaLuminaria, setNuevaLuminaria] = useState(() => {
    const tipoInicial = TIPOS_LUMINARIA[0];
    const tamañoInicial = tipoInicial.tamaños[0];
    return {
      tipo: tipoInicial.tipo,
      potencia: tamañoInicial.watt,
      ancho: tamañoInicial.ancho,
      largo: tamañoInicial.largo,
      altura: 50,
    };
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [arrastrandoLuminaria, setArrastrandoLuminaria] = useState<number | null>(null);
  const [alertas, setAlertas] = useState<string[]>([]);
  const [selectedLuminaria, setSelectedLuminaria] = useState<number | null>(null);
  const [validacion, setValidacion] = useState<ResultadoValidacion>({ 
    alertas: [], 
    optimizado: false, 
    wattsRestantes: [] 
  });

  useEffect(() => {
    if (!initialConfig) {
      fetchConfiguracion();
    }
    fetchIluminacionConfig();
  }, [cultivoId, initialConfig]);

  const fetchConfiguracion = async () => {
    try {
      const response = await fetch(`/api/cultivos/config-iluminacion?cultivoId=${cultivoId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        setConfig(data.data);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (error) {
      console.error('Error al cargar la configuración del cultivo:', error);
      setMessage('Error al cargar la configuración del cultivo. Por favor, intente más tarde.');
      setConfig({
        numPlantas: 0,
        maxCapacity: 0,
        espacioAncho: 300,
        espacioLargo: 300,
        maceteroAncho: 20,
        maceteroLargo: 20
      });
    }
  };

  const fetchIluminacionConfig = async () => {
    try {
      const response = await fetch(`/api/cultivos/config-iluminacion?cultivoId=${cultivoId}`);
      const data = await response.json();
      if (data.success && data.data) {
        setLuminarias(data.data.luminarias || []);
      }
    } catch (error) {
      console.error('Error al cargar la configuración de iluminación:', error);
    } finally {
      setLoading(false);
    }
  };

  const validarEspacioYWataje = (): ResultadoValidacion => {
    if (!config) return { alertas: [], optimizado: false, wattsRestantes: [] };

    const nuevasAlertas: string[] = [];
    const espacioActual = `${config.espacioAncho}x${config.espacioLargo}`;
    let watajeTotalPorTipo: { [key: string]: number } = {};
    const wattsRestantes: ResultadoValidacion['wattsRestantes'] = [];

    luminarias.forEach(lum => {
      watajeTotalPorTipo[lum.tipo] = (watajeTotalPorTipo[lum.tipo] || 0) + lum.potencia;
    });

    Object.entries(watajeTotalPorTipo).forEach(([tipo, wattsTotal]) => {
      const tipoConfig = TIPOS_LUMINARIA.find(t => t.tipo === tipo);
      if (tipoConfig) {
        const espacioConfig = tipoConfig.espaciosCultivo.find(e => {
          const [ancho, largo] = e.espacio.split('x').map(Number);
          return config.espacioAncho <= ancho && config.espacioLargo <= largo;
        });

        if (espacioConfig) {
          // Calcular watts restantes para llegar al máximo
          const wattsRestantesParaMaximo = espacioConfig.maxWatt - wattsTotal;
          
          wattsRestantes.push({
            tipo,
            actual: wattsTotal,
            maximo: espacioConfig.maxWatt,
            restante: wattsRestantesParaMaximo
          });

          if (wattsTotal < espacioConfig.minWatt) {
            nuevasAlertas.push(
              `⚠️ Potencia insuficiente: ${tipo} necesita mínimo ${espacioConfig.minWatt}W para un espacio de ${espacioActual}cm`
            );
          } else if (wattsTotal > espacioConfig.maxWatt) {
            nuevasAlertas.push(
              `⚠️ Exceso de potencia: ${tipo} supera el máximo de ${espacioConfig.maxWatt}W para un espacio de ${espacioActual}cm`
            );
          }
        } else {
          nuevasAlertas.push(
            `⚠️ El espacio actual (${espacioActual}cm) es demasiado grande para luminarias ${tipo}`
          );
        }
      }
    });

    // Determinar si la configuración está optimizada
    const optimizado = nuevasAlertas.length === 0 && Object.keys(watajeTotalPorTipo).length > 0;

    return { alertas: nuevasAlertas, optimizado, wattsRestantes };
  };

  useEffect(() => {
    if (config && luminarias.length > 0) {
      const resultado = validarEspacioYWataje();
      setValidacion(resultado);
    } else if (config) {
      setValidacion({
        alertas: luminarias.length === 0 ? ["⚠️ No hay luminarias configuradas"] : [],
        optimizado: false,
        wattsRestantes: []
      });
    }
  }, [config, luminarias]);

  const handleSeleccionarLuminaria = (id: number) => {
    setSelectedLuminaria(id === selectedLuminaria ? null : id);
  };

  const handleEditarLuminaria = () => {
    if (selectedLuminaria === null) return;
    
    const luminaria = luminarias.find(l => l.id === selectedLuminaria);
    if (luminaria) {
      setEditandoLuminaria(luminaria);
      setNuevaLuminaria({
        tipo: luminaria.tipo,
        potencia: luminaria.potencia,
        ancho: luminaria.ancho,
        largo: luminaria.largo,
        altura: luminaria.altura,
      });
      setShowModal(true);
    }
  };

  const handleEliminarLuminaria = () => {
    if (selectedLuminaria === null) return;
    
    const nuevasLuminarias = luminarias.filter(l => l.id !== selectedLuminaria);
    setLuminarias(nuevasLuminarias);
    setSelectedLuminaria(null);
    guardarConfiguracion(nuevasLuminarias);
  };

  const handleAgregarLuminaria = () => {
    if (!config) return;

    if (editandoLuminaria) {
      // Modo edición
      const nuevasLuminarias = luminarias.map(lum => {
        if (lum.id === editandoLuminaria.id) {
          return {
            ...lum,
            tipo: nuevaLuminaria.tipo,
            potencia: nuevaLuminaria.potencia,
            ancho: nuevaLuminaria.ancho,
            largo: nuevaLuminaria.largo,
            altura: nuevaLuminaria.altura,
          };
        }
        return lum;
      });
      
      setLuminarias(nuevasLuminarias);
      setEditandoLuminaria(null);
      setSelectedLuminaria(null);
      guardarConfiguracion(nuevasLuminarias);
    } else {
      // Modo agregar nuevo
      const newLuminaria: Luminaria = {
        id: Date.now(),
        ...nuevaLuminaria,
        posicionX: (config.espacioAncho - nuevaLuminaria.ancho) / 2,
        posicionY: (config.espacioLargo - nuevaLuminaria.largo) / 2,
        selected: false,
      };

      const nuevasLuminarias = [...luminarias, newLuminaria];
      setLuminarias(nuevasLuminarias);
      guardarConfiguracion(nuevasLuminarias);
    }
    
    setShowModal(false);
  };

  const handleMouseDown = (id: number) => {
    setArrastrandoLuminaria(id);
    setSelectedLuminaria(id);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (arrastrandoLuminaria === null || !config) return;

    const contenedor = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - contenedor.left;
    const y = e.clientY - contenedor.top;

    setLuminarias(luminarias.map(luminaria => {
      if (luminaria.id === arrastrandoLuminaria) {
        return {
          ...luminaria,
          posicionX: Math.max(0, Math.min(x, config.espacioAncho - luminaria.ancho)),
          posicionY: Math.max(0, Math.min(y, config.espacioLargo - luminaria.largo)),
        };
      }
      return luminaria;
    }));
  };

  const handleMouseUp = () => {
    if (arrastrandoLuminaria !== null) {
      guardarConfiguracion(luminarias);
      setArrastrandoLuminaria(null);
    }
  };

  // Manejar eventos táctiles para dispositivos móviles sin preventDefault
  const handleTouchStart = (id: number, e: React.TouchEvent<HTMLDivElement>) => {
    // No llamamos a preventDefault() para evitar el error
    setArrastrandoLuminaria(id);
    setSelectedLuminaria(id);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // No llamamos a preventDefault() para evitar el error
    if (arrastrandoLuminaria === null || !config) return;

    const touch = e.touches[0];
    const contenedor = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - contenedor.left;
    const y = touch.clientY - contenedor.top;

    setLuminarias(luminarias.map(luminaria => {
      if (luminaria.id === arrastrandoLuminaria) {
        return {
          ...luminaria,
          posicionX: Math.max(0, Math.min(x, config.espacioAncho - luminaria.ancho)),
          posicionY: Math.max(0, Math.min(y, config.espacioLargo - luminaria.largo)),
        };
      }
      return luminaria;
    }));
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  const guardarConfiguracion = async (luminariaActualizadas: Luminaria[]) => {
    setLoading(true);
    try {
      const response = await fetch('/api/cultivos/config-iluminacion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cultivoId,
          iluminacion: {
            luminarias: luminariaActualizadas,
            ciclo: {
              horasEncendido: 18,
              horasApagado: 6,
            },
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage('Configuración guardada exitosamente');
      } else {
        setMessage('Error al guardar la configuración');
      }
    } catch (error) {
      setMessage('Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-2 md:px-6">
      {/* Mensajes informativos (alertas o mensaje de optimización) */}
      {validacion.optimizado ? (
        <div className="bg-green-50 border-l-4 border-green-400 p-3 md:p-4 text-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Configuración óptima de iluminación
              </h3>
              <div className="mt-1 text-xs md:text-sm text-green-700">
                <p>Tu cultivo cuenta con la iluminación ideal para el espacio seleccionado.</p>
                {validacion.wattsRestantes.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-green-600 opacity-80">
                    {validacion.wattsRestantes.map((info, index) => (
                      <li key={index}>
                        {info.tipo}: {info.actual}W / {info.maximo}W máximo 
                        {info.restante > 0 ? ` (puedes agregar hasta ${info.restante}W más)` : ' (potencia máxima alcanzada)'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : validacion.alertas.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 md:p-4 text-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Advertencias de iluminación
              </h3>
              <div className="mt-1 text-xs md:text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {validacion.alertas.map((alerta, index) => (
                    <li key={index}>{alerta}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Área de visualización */}
      <div className="overflow-auto md:overflow-hidden">
        <div
          className="relative border-2 border-gray-300 bg-gray-100"
          style={{
            width: `${config?.espacioAncho}px`,
            height: `${config?.espacioLargo}px`,
            margin: '0 auto',
            maxWidth: '100%'
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Representación de las plantas */}
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: config?.numPlantas || 0 }).map((_, index) => {
              const columnas = Math.ceil(Math.sqrt(config?.numPlantas || 0));
              const x = (index % columnas) * ((config?.espacioAncho || 0) / columnas);
              const y = Math.floor(index / columnas) * ((config?.espacioLargo || 0) / columnas);
              return (
                <div
                  key={index}
                  className="absolute text-2xl"
                  style={{ left: `${x}px`, top: `${y}px` }}
                >
                  🌱
                </div>
              );
            })}
          </div>

          {/* Luminarias */}
          {luminarias.map((luminaria) => (
            <div
              key={luminaria.id}
              className={`absolute ${
                luminaria.id === selectedLuminaria ? 'ring-2 ring-blue-500 z-10' : ''
              }`}
              style={{
                left: `${luminaria.posicionX}px`,
                top: `${luminaria.posicionY}px`,
                width: `${luminaria.ancho}px`,
                height: `${luminaria.largo}px`,
                backgroundColor: 'rgba(255, 255, 0, 0.3)',
                border: '2px solid rgba(255, 255, 0, 0.5)',
                borderRadius: '4px',
                touchAction: 'none', // Esto ayuda a prevenir desplazamiento no deseado en dispositivos táctiles
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSeleccionarLuminaria(luminaria.id);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(luminaria.id);
              }}
              onTouchStart={(e) => {
                handleTouchStart(luminaria.id, e);
              }}
            >
              <div className="text-xs p-1 text-center">
                {luminaria.tipo} {luminaria.potencia}W
                <br />
                {luminaria.altura}cm
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controles para la luminaria seleccionada */}
      {selectedLuminaria !== null && (
        <div className="flex justify-center space-x-2 mb-2">
          <button
            onClick={handleEditarLuminaria}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm md:text-base flex items-center shadow-md"
            title="Editar luminaria"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Editar</span>
          </button>
          <button
            onClick={handleEliminarLuminaria}
            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm md:text-base flex items-center shadow-md"
            title="Eliminar luminaria"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Eliminar</span>
          </button>
        </div>
      )}

      {/* Controles principales */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            setEditandoLuminaria(null);
            setNuevaLuminaria(() => {
              const tipoInicial = TIPOS_LUMINARIA[0];
              const tamañoInicial = tipoInicial.tamaños[0];
              return {
                tipo: tipoInicial.tipo,
                potencia: tamañoInicial.watt,
                ancho: tamañoInicial.ancho,
                largo: tamañoInicial.largo,
                altura: 50,
              };
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm md:text-base flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Agregar Luminaria
        </button>
      </div>

      {/* Modal para agregar/editar luminaria */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              {editandoLuminaria ? 'Editar Luminaria' : 'Agregar Nueva Luminaria'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tipo de Luminaria
                  <select
                    value={nuevaLuminaria.tipo}
                    onChange={(e) => {
                      const tipo = TIPOS_LUMINARIA.find(t => t.tipo === e.target.value);
                      if (tipo) {
                        const primerTamaño = tipo.tamaños[0];
                        setNuevaLuminaria({
                          ...nuevaLuminaria,
                          tipo: tipo.tipo,
                          potencia: primerTamaño.watt,
                          ancho: primerTamaño.ancho,
                          largo: primerTamaño.largo,
                        });
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm md:text-base"
                  >
                    {TIPOS_LUMINARIA.map(tipo => (
                      <option key={tipo.tipo} value={tipo.tipo}>{tipo.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Potencia (Watts)
                  <select
                    value={nuevaLuminaria.potencia}
                    onChange={(e) => {
                      const potencia = Number(e.target.value);
                      const tipo = TIPOS_LUMINARIA.find(t => t.tipo === nuevaLuminaria.tipo);
                      const tamaño = tipo?.tamaños.find(t => t.watt === potencia);
                      if (tamaño) {
                        setNuevaLuminaria({
                          ...nuevaLuminaria,
                          potencia,
                          ancho: tamaño.ancho,
                          largo: tamaño.largo,
                        });
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm md:text-base"
                  >
                    {TIPOS_LUMINARIA.find(t => t.tipo === nuevaLuminaria.tipo)?.tamaños.map(tamaño => (
                      <option key={tamaño.watt} value={tamaño.watt}>
                        {tamaño.watt}W ({tamaño.ancho}x{tamaño.largo}cm)
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Altura (cm)
                  <input
                    type="number"
                    value={nuevaLuminaria.altura}
                    onChange={(e) => setNuevaLuminaria({
                      ...nuevaLuminaria,
                      altura: Number(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm md:text-base"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditandoLuminaria(null);
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm md:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={handleAgregarLuminaria}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm md:text-base"
              >
                {editandoLuminaria ? 'Guardar Cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default IluminacionPlanner;