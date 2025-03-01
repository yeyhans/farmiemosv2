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

function AmbienteLogsList({ ambiente_logs: initialLogs = [], cultivoId, user_id }: Props) {
  const [logs, setLogs] = useState(initialLogs);
  const [filteredLogs, setFilteredLogs] = useState(initialLogs);
  
  useEffect(() => {
    const handleLogsUpdate = (event: CustomEvent<{ logs: Log[] }>) => {
      setLogs(event.detail.logs);
      setFilteredLogs(event.detail.logs);
    };
    
    window.addEventListener('ambiente-logs-updated', handleLogsUpdate as EventListener);
    return () => window.removeEventListener('ambiente-logs-updated', handleLogsUpdate as EventListener);
  }, []);
  
  if (!logs?.length) return null;

  const columns = [
    { header: 'Fecha', accessor: 'timestamp' },
    { header: 'Temperatura', accessor: 'temperatura', unit: '°C' },
    { header: 'Humedad', accessor: 'humedad', unit: '%' },
    { header: 'VPD', accessor: 'vpd', unit: 'kPa' },
    { header: 'Punto de rocío', accessor: 'dewpoint', unit: '°C' },
  ];

  const handleFilterChange = (newFilteredLogs: Log[]) => {
    setFilteredLogs(newFilteredLogs);
  };

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-xl font-semibold">Logs del Ambiente</h2>
      <AmbienteLogsFilter logs={logs} onFilterChange={handleFilterChange} />
      
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th key={col.accessor} className="px-4 py-2 text-left font-medium text-gray-500">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLogs
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((log, idx) => (
                <tr key={idx} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  {columns.slice(1).map(col => (
                    <td key={col.accessor} className="px-4 py-2">
                      {log[col.accessor as keyof Log]}{col.unit}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AmbienteLogsList;