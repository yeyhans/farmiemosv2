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

function AmbienteLogsList({ ambiente_logs }: Props) {
  if (!ambiente_logs || ambiente_logs.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Logs del Ambiente</h2>
      <div className="grid grid-cols-1 gap-4">
        {ambiente_logs
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .map((log, index) => (
            <div key={index} className="bg-white shadow rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-2">
                {new Date(log.timestamp).toLocaleString()}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Temperatura:</p>
                  <p className="text-gray-600">{log.temperatura}°C</p>
                  <p className="font-medium">Humedad:</p>
                  <p className="text-gray-600">{log.humedad}%</p>
                  <p className="font-medium">VPD:</p>
                  <p className="text-gray-600">{log.vpd} kPa</p>
                  <p className="font-medium">Dewpoint:</p>
                  <p className="text-gray-600">{log.dewpoint}°C</p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default AmbienteLogsList;