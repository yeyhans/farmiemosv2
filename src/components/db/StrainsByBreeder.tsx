import React, { useState, useEffect, useRef, useCallback } from 'react';

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

interface BreederInfo {
  breeder: string;
  count: number;
}

interface PaginationInfo {
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
}

const ITEMS_PER_PAGE = 10;

const StrainCard = React.memo(({ strain }: { strain: Strain }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  const strainUrl = `/db/strains/_${strain._id}`;

  return (
    <div
      ref={cardRef}
      className={`border rounded-lg p-4 hover:shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <h3 className="text-xl font-semibold mb-2">
        <a
          href={strainUrl}
          className="text-green-600 hover:text-green-700 hover:underline"
        >
          {strain['Strain Name']}
        </a>
      </h3>
      <div className="space-y-2 text-sm">
        <p>
          <span className="font-medium">Genética:</span> {strain.Genetics}
        </p>
        <p>
          <span className="font-medium">Tiempo de floración:</span>{' '}
          {strain['Flowering Time']} días
        </p>
        <p>
          <span className="font-medium">Feminizada:</span>{' '}
          {strain.Feminized}
        </p>
        <p className="line-clamp-3">
          {strain.Description}
        </p>
        <div className="flex justify-between items-center mt-4">
          <a
            href={strainUrl}
            className="text-green-600 hover:text-green-700 inline-flex items-center"
          >
            Ver detalles
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
          {strain['Strain URL'] && (
            <a
              href={strain['Strain URL']}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700"
            >
              Fuente original ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
});

export default function StrainsByBreeder() {
  const [breeders, setBreeders] = useState<BreederInfo[]>([]);
  const [selectedBreeder, setSelectedBreeder] = useState<string | null>(null);
  const [strains, setStrains] = useState<Strain[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Cargar breeders
  useEffect(() => {
    const fetchBreeders = async () => {
      try {
        const response = await fetch('/api/strains/breeders');
        const data = await response.json();
        setBreeders(data);
      } catch (error) {
        console.error('Error al cargar breeders:', error);
      }
    };
    fetchBreeders();
  }, []);

  // Cargar cepas cuando se selecciona un breeder
  useEffect(() => {
    if (!selectedBreeder) {
      setStrains([]);
      return;
    }

    const fetchStrains = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/strains/by-breeder/${encodeURIComponent(selectedBreeder)}?page=${currentPage}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(searchTerm)}`
        );
        const data = await response.json();
        setStrains(data.strains);
        setPagination(data.pagination);
      } catch (error) {
        console.error('Error al cargar cepas:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchStrains, 300);
    return () => clearTimeout(debounceTimer);
  }, [selectedBreeder, currentPage, searchTerm]);

  const handleBreederSelect = (breeder: string) => {
    // Usar encodeURIComponent para manejar caracteres especiales en la URL
    window.location.href = `/db/breeders/${encodeURIComponent(breeder)}`;
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {breeders.map((breederInfo) => (
            <button
              key={breederInfo.breeder}
              onClick={() => handleBreederSelect(breederInfo.breeder)}
              className="p-3 rounded-lg text-left bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
            >
              <span className="font-medium block">{breederInfo.breeder}</span>
              <span className="block text-sm text-gray-600">
                {breederInfo.count} cepas
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div ref={loadingRef} className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
        </div>
      )}

      {selectedBreeder && !loading && (
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Cepas de {selectedBreeder}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strains.map((strain) => (
              <StrainCard key={strain._id} strain={strain} />
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-4 py-2">
                Página {currentPage} de {pagination.pages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                disabled={currentPage === pagination.pages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 