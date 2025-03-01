import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import AmbienteLogsFilter from './AmbienteLogsFilter';

interface Log {
    timestamp: string;
    temperatura: number;
    humedad: number;
    vpd: number;
    dewpoint: number;
  }
  
  interface Props {
    ambiente_logs?: Log[];
    cultivoId: string;
    user_id: string;
  }
  
  function AmbienteLogsGraph({ ambiente_logs: initialLogs = [], cultivoId, user_id }: Props) {
    const [logs, setLogs] = useState(initialLogs);
    const [filteredLogs, setFilteredLogs] = useState(initialLogs);
    const [combinedView, setCombinedView] = useState(false);
    const [visibleLines, setVisibleLines] = useState({
      temperatura: true,
      humedad: true,
      vpd: true,
      dewpoint: true
    });
    const [activeGraph, setActiveGraph] = useState<'temperatura' | 'humedad' | 'vpd' | 'dewpoint' | 'todos'>('temperatura');
    const [isMobile, setIsMobile] = useState(false);
    
    // Detectar si es dispositivo móvil
    useEffect(() => {
      const checkIfMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      
      checkIfMobile();
      window.addEventListener('resize', checkIfMobile);
      
      return () => {
        window.removeEventListener('resize', checkIfMobile);
      };
    }, []);
    
    // Escuchar eventos de actualización
    useEffect(() => {
        const handleLogsUpdate = (event: CustomEvent<{ logs: Log[] }>) => {
            // Asegurar que logs nunca sea null
            setLogs(event.detail.logs || []);
        };
        
        window.addEventListener('ambiente-logs-updated', handleLogsUpdate as EventListener);
        
        return () => {
            window.removeEventListener('ambiente-logs-updated', handleLogsUpdate as EventListener);
        };
    }, []);
    
    // Actualizar filteredLogs cuando logs cambia
    useEffect(() => {
      setFilteredLogs(logs);
    }, [logs]);
    
    // Añadir un useEffect para resetear las líneas visibles cuando se cambia de gráfico
    useEffect(() => {
      if (activeGraph === 'todos') return;
      
      // Si no es la vista combinada, asegurarse de que la línea correspondiente esté activa
      setVisibleLines({
        temperatura: activeGraph === 'temperatura',
        humedad: activeGraph === 'humedad',
        vpd: activeGraph === 'vpd',
        dewpoint: activeGraph === 'dewpoint'
      });
    }, [activeGraph]);
    
    if (!logs || logs.length === 0) {
      return (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold">Logs del Ambiente</h2>
          </div>
          <div className="py-8 text-center bg-gray-50 rounded-md">
            <p className="text-gray-500">No hay datos de ambiente disponibles</p>
          </div>
        </div>
      );
    }

    const sortedLogs = filteredLogs.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const toggleLine = (line: keyof typeof visibleLines) => {
      setVisibleLines(prev => ({
        ...prev,
        [line]: !prev[line]
      }));
    };

    // Función para formatear la fecha como dd/mm/yy
    const formatDate = (timestamp: string) => {
      const date = new Date(timestamp);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(2);
      return `${day}/${month}/${year}`;
    };

    // Función para formatear fecha y hora
    const formatDateTime = (timestamp: string) => {
      const date = new Date(timestamp);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(2);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    return (
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold">Logs del Ambiente</h2>
          {!isMobile && (
            <button
              onClick={() => setCombinedView(!combinedView)}
              className="text-xs px-4 py-2 bg-blue-600 text-white rounded hover:bg-custom-blue transition-colors"
            >
              {combinedView ? 'Ver Separados' : 'Ver Combinados'}
            </button>
          )}
        </div>

        {/* Agregar filtro de tiempo */}
        <AmbienteLogsFilter onFilterChange={setFilteredLogs} logs={logs} />

        {/* Botones de navegación para móvil */}
        {isMobile && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setActiveGraph('temperatura')}
              className={`px-3 py-1 rounded text-sm ${activeGraph === 'temperatura' 
                ? 'bg-[#ff7300] text-white' 
                : 'bg-gray-200 text-gray-700'}`}
            >
              🌡️
            </button>
            <button
              onClick={() => setActiveGraph('humedad')}
              className={`px-3 py-1 rounded text-sm ${activeGraph === 'humedad' 
                ? 'bg-[#82ca9d] text-white' 
                : 'bg-gray-200 text-gray-700'}`}
            >
              💧
            </button>
            <button
              onClick={() => setActiveGraph('vpd')}
              className={`px-3 py-1 rounded text-sm ${activeGraph === 'vpd' 
                ? 'bg-[#8884d8] text-white' 
                : 'bg-gray-200 text-gray-700'}`}
            >
              🌡️ + 💧
            </button>
            <button
              onClick={() => setActiveGraph('dewpoint')}
              className={`px-3 py-1 rounded text-sm ${activeGraph === 'dewpoint' 
                ? 'bg-[#1f77b4] text-white' 
                : 'bg-gray-200 text-gray-700'}`}
            >
              🌫️
            </button>
            <button
              onClick={() => setActiveGraph('todos')}
              className={`px-3 py-1 rounded text-sm ${activeGraph === 'todos' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'}`}
            >
              🖇️
            </button>
          </div>
        )}

        {combinedView && !isMobile && (
          <div className="flex gap-4 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.temperatura}
                onChange={() => toggleLine('temperatura')}
                className="mr-2"
              />
              <span className="text-[#ff7300]">🌡️</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.humedad}
                onChange={() => toggleLine('humedad')}
                className="mr-2"
              />
              <span className="text-[#82ca9d]">💧</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.vpd}
                onChange={() => toggleLine('vpd')}
                className="mr-2"
              />
              <span className="text-[#8884d8]">🌡️ + 💧</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.dewpoint}
                onChange={() => toggleLine('dewpoint')}
                className="mr-2"
              />
              <span className="text-[#1f77b4]">🌫️</span>
            </label>
          </div>
        )}

        {/* Filtros para móvil cuando se muestra el gráfico combinado */}
        {isMobile && activeGraph === 'todos' && (
          <div className="flex flex-wrap gap-2 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.temperatura}
                onChange={() => toggleLine('temperatura')}
                className="mr-1"
              />
              <span className="text-[#ff7300] text-sm">Temp</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.humedad}
                onChange={() => toggleLine('humedad')}
                className="mr-1"
              />
              <span className="text-[#82ca9d] text-sm">Hum</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.vpd}
                onChange={() => toggleLine('vpd')}
                className="mr-1"
              />
              <span className="text-[#8884d8] text-sm">VPD</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.dewpoint}
                onChange={() => toggleLine('dewpoint')}
                className="mr-1"
              />
              <span className="text-[#1f77b4] text-sm">P.Rocío</span>
            </label>
          </div>
        )}

        <div className={(!isMobile && !combinedView) ? "grid grid-cols-2 gap-4" : ""}>
          {/* Versión para escritorio */}
          {!isMobile ? (
            combinedView ? (
              <div className="h-[600px]">
                <h3 className="text-sm font-medium text-center mb-2">Todas las métricas</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedLogs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis yAxisId="temp" unit="°C" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="hum" orientation="right" unit="%" tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={formatDateTime}
                    />
                    {visibleLines.temperatura && (
                      <Line yAxisId="temp" type="monotone" dataKey="temperatura" stroke="#ff7300" name="Temperatura" />
                    )}
                    {visibleLines.humedad && (
                      <Line yAxisId="hum" type="monotone" dataKey="humedad" stroke="#82ca9d" name="Humedad" />
                    )}
                    {visibleLines.dewpoint && (
                      <Line yAxisId="temp" type="monotone" dataKey="dewpoint" stroke="#1f77b4" name="Punto de Rocío" />
                    )}
                    {visibleLines.vpd && (
                      <Line yAxisId="hum" type="monotone" dataKey="vpd" stroke="#8884d8" name="VPD" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <>
                {/* Gráfico de Temperatura */}
                <div className="h-[300px]">
                  <h3 className="text-sm font-medium text-center mb-2 text-[#ff7300]">Temperatura</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sortedLogs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis unit="°C" tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={formatDateTime}
                      />
                      <Line type="monotone" dataKey="temperatura" stroke="#ff7300" name="Temperatura" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfico de Humedad */}
                <div className="h-[300px]">
                  <h3 className="text-sm font-medium text-center mb-2 text-[#82ca9d]">Humedad</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sortedLogs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis unit="%" tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={formatDateTime}
                      />
                      <Line type="monotone" dataKey="humedad" stroke="#82ca9d" name="Humedad" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfico de VPD */}
                <div className="h-[300px]">
                  <h3 className="text-sm font-medium text-center mb-2 text-[#8884d8]">VPD</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sortedLogs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis unit=" kPa" tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={formatDateTime}
                      />
                      <Line type="monotone" dataKey="vpd" stroke="#8884d8" name="VPD" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfico de Punto de Rocío */}
                <div className="h-[300px]">
                  <h3 className="text-sm font-medium text-center mb-2 text-[#1f77b4]">Punto de Rocío</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sortedLogs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis unit="°C" tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={formatDateTime}
                      />
                      <Line type="monotone" dataKey="dewpoint" stroke="#1f77b4" name="Punto de Rocío" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )
          ) : (
            // Vista para móviles
            <div className="h-[400px]">
              {activeGraph === 'todos' ? (
                <>
                  <h3 className="text-sm font-medium text-center mb-2">Todas las métricas</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sortedLogs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis yAxisId="temp" unit="°C" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="hum" orientation="right" unit="%" tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={formatDateTime}
                      />
                      {visibleLines.temperatura && (
                        <Line yAxisId="temp" type="monotone" dataKey="temperatura" stroke="#ff7300" name="Temperatura" />
                      )}
                      {visibleLines.humedad && (
                        <Line yAxisId="hum" type="monotone" dataKey="humedad" stroke="#82ca9d" name="Humedad" />
                      )}
                      {visibleLines.dewpoint && (
                        <Line yAxisId="temp" type="monotone" dataKey="dewpoint" stroke="#1f77b4" name="Punto de Rocío" />
                      )}
                      {visibleLines.vpd && (
                        <Line yAxisId="hum" type="monotone" dataKey="vpd" stroke="#8884d8" name="VPD" />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : activeGraph === 'temperatura' ? (
                <>
                  <h3 className="text-sm font-medium text-center mb-2 text-[#ff7300]">Temperatura</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sortedLogs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis unit="°C" tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={formatDateTime}
                      />
                      <Line type="monotone" dataKey="temperatura" stroke="#ff7300" name="Temperatura" />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : activeGraph === 'humedad' ? (
                <>
                  <h3 className="text-sm font-medium text-center mb-2 text-[#82ca9d]">Humedad</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sortedLogs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis unit="%" tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={formatDateTime}
                      />
                      <Line type="monotone" dataKey="humedad" stroke="#82ca9d" name="Humedad" />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : activeGraph === 'vpd' ? (
                <>
                  <h3 className="text-sm font-medium text-center mb-2 text-[#8884d8]">VPD</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sortedLogs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis unit=" kPa" tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={formatDateTime}
                      />
                      <Line type="monotone" dataKey="vpd" stroke="#8884d8" name="VPD" />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-medium text-center mb-2 text-[#1f77b4]">Punto de Rocío</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sortedLogs}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis unit="°C" tick={{ fontSize: 10 }} />
                      <Tooltip
                        labelFormatter={formatDateTime}
                      />
                      <Line type="monotone" dataKey="dewpoint" stroke="#1f77b4" name="Punto de Rocío" />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  export default AmbienteLogsGraph