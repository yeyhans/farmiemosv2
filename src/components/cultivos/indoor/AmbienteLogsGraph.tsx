import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

interface Log {
    timestamp: string;
    temperatura: number;
    humedad: number;
    vpd: number;
    dewpoint: number;
  }
  
  interface Props {
    ambiente_logs?: Log[];
  }
  
  function AmbienteLogsGraph({ ambiente_logs }: Props) {
    if (!ambiente_logs || ambiente_logs.length === 0) return null;

    const [combinedView, setCombinedView] = useState(false);
    const [visibleLines, setVisibleLines] = useState({
      temperatura: true,
      humedad: true,
      vpd: true,
      dewpoint: true
    });
    
    const sortedLogs = ambiente_logs.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const toggleLine = (line: keyof typeof visibleLines) => {
      setVisibleLines(prev => ({
        ...prev,
        [line]: !prev[line]
      }));
    };

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Logs del Ambiente</h2>
          <button
            onClick={() => setCombinedView(!combinedView)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {combinedView ? 'Ver Separados' : 'Ver Combinados'}
          </button>
        </div>

        {combinedView && (
          <div className="flex gap-4 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.temperatura}
                onChange={() => toggleLine('temperatura')}
                className="mr-2"
              />
              <span className="text-[#ff7300]">Temperatura</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.humedad}
                onChange={() => toggleLine('humedad')}
                className="mr-2"
              />
              <span className="text-[#82ca9d]">Humedad</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.vpd}
                onChange={() => toggleLine('vpd')}
                className="mr-2"
              />
              <span className="text-[#8884d8]">VPD</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={visibleLines.dewpoint}
                onChange={() => toggleLine('dewpoint')}
                className="mr-2"
              />
              <span className="text-[#1f77b4]">Punto de Rocío</span>
            </label>
          </div>
        )}

        <div className={combinedView ? "" : "grid grid-cols-2 gap-4"}>
          {combinedView ? (
            <div className="h-[600px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedLogs}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                  />
                  <YAxis yAxisId="temp" unit="°C" />
                  <YAxis yAxisId="hum" orientation="right" unit="%" />
                  <Tooltip
                    labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
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
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedLogs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                    />
                    <YAxis unit="°C" />
                    <Tooltip
                      labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="temperatura" stroke="#ff7300" name="Temperatura" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de Humedad */}
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedLogs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                    />
                    <YAxis unit="%" />
                    <Tooltip
                      labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="humedad" stroke="#82ca9d" name="Humedad" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de VPD */}
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedLogs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                    />
                    <YAxis unit=" kPa" />
                    <Tooltip
                      labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="vpd" stroke="#8884d8" name="VPD" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de Punto de Rocío */}
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sortedLogs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                    />
                    <YAxis unit="°C" />
                    <Tooltip
                      labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="dewpoint" stroke="#1f77b4" name="Punto de Rocío" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  export default AmbienteLogsGraph