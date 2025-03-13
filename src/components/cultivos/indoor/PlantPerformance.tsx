import React from 'react';

interface PlantPerformanceProps {
  strainId: string;
  strainData: {
    nombre: string;
    suelo: {
      tipo: string;
      marca?: string;
      cantidad?: number;
      composicion?: Record<string, number>;
    };
    color: string;
  };
}

export const PlantPerformance: React.FC<PlantPerformanceProps> = ({ strainId, strainData }) => {
  return (
    <div className="space-y-6">
      {/* Grid de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tarjeta de Ambiente */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Datos Ambientales</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">VPD</span>
              <span className="font-medium">1.12 - 1.26</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Temperatura</span>
              <span className="font-medium">23°C - 26°C</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Humedad</span>
              <span className="font-medium">60% - 65%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>
        </div>

        {/* Tarjeta de Eventos */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Eventos de Poda</h3>
          <div className="space-y-3">
            {[
              { fecha: '28/02', descripcion: 'Primera poda' },
              { fecha: '04/03', descripcion: 'Segunda poda' },
              { fecha: '10/03', descripcion: 'Tercera poda' }
            ].map((evento, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">{evento.fecha}</span>
                <span className="text-sm text-gray-600">{evento.descripcion}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tarjeta de Último Riego */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Último Riego</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Fecha</span>
              <span className="font-medium">11/03/2024</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">pH</span>
              <span className="font-medium text-red-500">2.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Humedad</span>
              <span className="font-medium">60-65%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Alertas */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Alertas y Recomendaciones</h3>
        <div className="space-y-2">
          <div className="bg-red-50 border-l-4 border-red-500 p-3">
            <p className="text-red-700">⚠️ pH crítico detectado (pH 2) - Ajustar inmediatamente</p>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3">
            <p className="text-yellow-700">📊 Ajustar VPD para optimizar fase de floración</p>
          </div>
          <div className="bg-green-50 border-l-4 border-green-500 p-3">
            <p className="text-green-700">✅ Desarrollo radicular óptimo con sustrato Biobizz</p>
          </div>
        </div>
      </div>

      {/* Comparativa con otras plantas */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Comparativa con otras plantas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Ventajas del Sustrato</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Mayor retención de nutrientes</li>
              <li>Control pH optimizado</li>
              <li>Mejor oxigenación radicular</li>
            </ul>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Desarrollo vs Otras Candylousy</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>+15% crecimiento vertical</li>
              <li>Mayor densidad de cogollos</li>
              <li>Mejor respuesta post-poda</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}; 