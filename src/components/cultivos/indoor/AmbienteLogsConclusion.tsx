import { useState } from 'react';

function AmbienteLogsConclusion() {
  const [conclusion, setConclusion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generarConclusion = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulamos un pequeño retraso para dar sensación de procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mensaje temporal humorístico en lugar de la llamada API real
      setConclusion(
        "¡Gracias por tu interés en generar conclusiones para el ambiente de cultivo! 😊\n\n" +
        "Por el momento, estamos trabajando en esta funcionalidad para brindarte análisis inteligentes de tus datos ambientales.\n\n" +
        "Mientras tanto, no dudes en contactarnos a través de nuestras redes sociales para cualquier consulta o sugerencia:\n" +
        "• Instagram: @farmiemos\n" +
        "• Whatsapp: @+56981570958\n" +
        "¡Pronto tendremos esta característica disponible para ti! 🌱"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Conclusiones del Ambiente</h2>
      
      <button
        onClick={generarConclusion}
        disabled={isLoading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Generando...' : 'Generar Conclusión'}
      </button>

      {error && (
        <div className="mt-3 text-red-600 bg-red-100 p-3 rounded">
          {error}
        </div>
      )}

      {conclusion && (
        <div className="mt-4">
          <h3 className="font-medium mb-2">Editar Conclusión:</h3>
          <textarea
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            className="w-full h-48 p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="La conclusión generada aparecerá aquí y podrás editarla..."
          />
        </div>
      )}
    </div>
  );
}

export default AmbienteLogsConclusion;