import React, { useState, useEffect } from 'react';

interface Strain {
  _id: string;
  'Strain Name': string;
  'Strain URL': string;
  Breeder: string;
  'Flowering Time': string;
  Genetics: string;
  Feminized: string;
  Description: string;
  Lineage: string;
}

interface StrainInfoProps {
  strainId: string;
}

export default function StrainInfo({ strainId }: StrainInfoProps) {
  const [strain, setStrain] = useState<Strain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrainDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/strains/_${strainId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'No se pudo cargar la información de la cepa');
        }
        const data = await response.json();
        setStrain(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchStrainDetails();
  }, [strainId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !strain) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold text-red-600">Error</h2>
        <p className="mt-2">{error || 'No se encontró la información de la cepa'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{strain['Strain Name']}</h1>
        <p className="text-gray-600 mt-2">Por {strain.Breeder}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Información General</h2>
          <div className="space-y-3">
            <InfoItem label="Genética" value={strain.Genetics} />
            <InfoItem label="Tiempo de Floración" value={`${strain['Flowering Time']} días`} />
            <InfoItem label="Feminizada" value={strain.Feminized} />
            {strain.Lineage && (
              <InfoItem label="Linaje" value={strain.Lineage} />
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Descripción</h2>
          <p className="text-gray-700 leading-relaxed">{strain.Description}</p>
        </section>
      </div>

      {strain['Strain URL'] && (
        <div className="mt-8">
          <a
            href={strain['Strain URL']}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-green-600 hover:text-green-700"
          >
            Ver fuente original
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="font-medium text-gray-700">{label}:</span>{' '}
    <span className="text-gray-600">{value}</span>
  </div>
); 