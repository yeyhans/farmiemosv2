import React, { useState, useEffect, useCallback } from 'react';

interface AmbienteLog {
  timestamp: string;
  temperatura: number;
  humedad: number;
  vpd: number;
  dewpoint: number;
}

interface Ambiente {
  logs: AmbienteLog[];
  configuracion: any;
}

interface Props {
  cultivoId: string;
  user_id: string;
  ambiente_logs: AmbienteLog[];
}

export default function AmbienteLogs({ cultivoId, user_id, ambiente_logs }: Props) {
  const [ambiente, setAmbiente] = useState<Ambiente>({ 
    logs: ambiente_logs || [],
    configuracion: {} 
  });
  
  const [formData, setFormData] = useState({
    user_id: user_id,
    temperatura: '',
    humedad: '',
  });

  const [calculosEnVivo, setCalculosEnVivo] = useState({
    vpd: 0,
    dewpoint: 0,
  });

  // Memoizar funciones de cálculo
  const calcularVPD = useCallback((temp: number, hum: number) => {
    const a = 17.27, b = 237.7;
    const es = 0.6108 * Math.exp((a * temp) / (b + temp));
    const ea = es * (hum / 100);
    return es - ea;
  }, []);

  const calcularDewpoint = useCallback((temp: number, hum: number) => {
    const a = 17.27, b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(hum / 100);
    return (b * alpha) / (a - alpha);
  }, []);

  // Efecto para cálculos en vivo
  useEffect(() => {
    const temp = parseFloat(formData.temperatura);
    const hum = parseFloat(formData.humedad);

    if (!isNaN(temp) && !isNaN(hum) && hum >= 0 && hum <= 100) {
      const vpd = calcularVPD(temp, hum);
      const dewpoint = calcularDewpoint(temp, hum);
      setCalculosEnVivo({
        vpd: Number(vpd.toFixed(2)),
        dewpoint: Number(dewpoint.toFixed(2))
      });
    } else {
      setCalculosEnVivo({ vpd: 0, dewpoint: 0 });
    }
  }, [formData, calcularVPD, calcularDewpoint]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convertir comas a puntos para decimales
    const sanitizedValue = value.replace(/,/g, '.');
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const temp = parseFloat(formData.temperatura);
    const hum = parseFloat(formData.humedad);
    
    if (isNaN(temp) || isNaN(hum)) return;

    const newLog: AmbienteLog = {
      timestamp: new Date().toISOString(),
      temperatura: temp,
      humedad: hum,
      vpd: calculosEnVivo.vpd,
      dewpoint: calculosEnVivo.dewpoint
    };

    try {
      const response = await fetch('/api/cultivos/ambiente-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cultivoId: cultivoId,
          ambiente_logs: [...ambiente.logs, newLog]
        })
      });

      if (response.ok) {
        setAmbiente(prev => ({
          ...prev,
          logs: [...prev.logs, newLog]
        }));
        setFormData({ user_id, temperatura: '', humedad: '' });
      } else {
        const errorData = await response.json();
        console.error('Error en la respuesta:', errorData);
      }
    } catch (error) {
      console.error('Error al guardar el log:', error);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="user_id" value={user_id} />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
            {/* Temperatura Input */}
            <div className="flex flex-col items-center space-y-2">
              <label htmlFor="temperatura" className="block text-sm font-medium text-gray-700">
                🌡️ (°C)
              </label>
              <input
                type="number"
                id="temperatura"
                name="temperatura"
                value={formData.temperatura}
                onChange={handleInputChange}
                className="w-full mt-1 block rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                placeholder="Temperatura"
                step="0.1"
                required
              />
            </div>

            {/* Humedad Input */}
            <div className="flex flex-col items-center space-y-2">
              <label htmlFor="humedad" className="block text-sm font-medium text-gray-700">
                💧 (%)
              </label>
              <input
                type="number"
                id="humedad"
                name="humedad"
                value={formData.humedad}
                onChange={handleInputChange}
                className="w-full mt-1 block rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                placeholder="Humedad"
                min="0"
                max="100"
                required
              />
            </div>

            {/* VPD Display */}
            <div className="bg-blue-100 p-2 rounded-lg text-center">
              <h2 className="text-sm font-semibold">VPD 💨</h2>
              <p className="text-xs font-bold text-blue-700">
                {calculosEnVivo.vpd.toFixed(2)} <span className="text-xs font-bold text-gray-900">kPa</span>
              </p>
            </div>

            {/* Dewpoint Display */}
            <div className="bg-green-100 p-2 rounded-lg text-center">
              <h2 className="text-sm font-semibold">Dewpoint 🌡️</h2>
              <p className="text-xs font-bold text-blue-700">
                {calculosEnVivo.dewpoint.toFixed(2)} <span className="text-xs font-bold text-gray-900">°C</span>
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1 bg-custom-green hover:bg-green-600 text-white font-medium text-sm py-2 px-3 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Registrar
          </button>
        </div>
      </form>

      
    </div>
  );
}
