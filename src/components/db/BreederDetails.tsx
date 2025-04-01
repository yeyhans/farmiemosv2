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

interface BreederStats {
  totalStrains: number;
  averageFloweringTime: number;
  feminizedCount: number;
  regularCount: number;
}

interface Props {
  breederName: string;
}

export default function BreederDetails({ breederName }: Props) {
  const [strains, setStrains] = useState<Strain[]>([]);
  const [stats, setStats] = useState<BreederStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const fetchBreederData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching data for breeder: ${breederName}`);
        const response = await fetch(
          `/api/strains/by-breeder/${encodeURIComponent(breederName)}?page=${currentPage}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(searchTerm)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar los datos');
        }

        const data = await response.json();
        console.log(`Received ${data.strains.length} strains for ${breederName}`);
        
        if (!data.strains || !Array.isArray(data.strains)) {
          throw new Error('Formato de datos inválido');
        }

        setStrains(data.strains);
        setTotalPages(Math.ceil(data.pagination.total / ITEMS_PER_PAGE));
        
        if (data.strains.length > 0) {
          // Calculate stats only if we have strains
          const stats: BreederStats = {
            totalStrains: data.pagination.total,
            averageFloweringTime: Math.round(
              data.strains.reduce((acc: number, strain: Strain) => 
                acc + (parseInt(strain['Flowering Time']) || 0), 0) / data.strains.length
            ),
            feminizedCount: data.strains.filter((s: Strain) => 
              s.Feminized?.toLowerCase() === 'yes').length,
            regularCount: data.strains.filter((s: Strain) => 
              s.Feminized?.toLowerCase() === 'no').length,
          };
          setStats(stats);
        }
      } catch (error) {
        console.error('Error fetching breeder data:', error);
        setError(error instanceof Error ? error.message : 'Error desconocido');
        setStrains([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    if (breederName) {
      fetchBreederData();
    }
  }, [breederName, currentPage, searchTerm]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold">Error al cargar los datos</h3>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={() => setCurrentPage(1)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (strains.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No se encontraron cepas para este breeder.</p>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Limpiar búsqueda
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Breeder Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-700">Total Cepas</h3>
            <p className="text-3xl font-bold text-green-600">{stats.totalStrains}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-700">Tiempo Promedio Floración</h3>
            <p className="text-3xl font-bold text-green-600">{stats.averageFloweringTime} días</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-700">Feminizadas</h3>
            <p className="text-3xl font-bold text-green-600">{stats.feminizedCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-700">Regulares</h3>
            <p className="text-3xl font-bold text-green-600">{stats.regularCount}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar cepas..."
            className="w-full p-3 pl-10 border rounded-lg"
            value={searchTerm}
            onChange={handleSearch}
          />
          <svg
            className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Strains Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strains.map((strain) => (
          <a
            key={strain._id}
            href={`/db/strains/_${strain._id}`}
            className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="p-4">
              <h3 className="text-xl font-semibold text-green-600 mb-2">
                {strain['Strain Name']}
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Genética:</span> {strain.Genetics}</p>
                <p><span className="font-medium">Floración:</span> {strain['Flowering Time']} días</p>
                <p><span className="font-medium">Tipo:</span> {strain.Feminized === 'Yes' ? 'Feminizada' : 'Regular'}</p>
                <p className="line-clamp-2">{strain.Description}</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Anterior
          </button>
          <span className="px-4 py-2">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
} 