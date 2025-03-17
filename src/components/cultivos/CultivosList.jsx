import React, { useState, useMemo, useEffect } from 'react';

const CultivosList = ({ cultivos }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // Options: all, active, inactive
  const [sortedCultivos, setSortedCultivos] = useState([]);
  
  // Función para determinar la fecha de actividad más reciente de un cultivo
  const getLatestActivityDate = (cultivo) => {
    const dates = [];
    
    // Recopilar todas las fechas de actividad
    if (cultivo.ambiente_logs?.length) {
      dates.push(...cultivo.ambiente_logs.map(log => new Date(log.created_at).getTime()));
    }
    
    if (cultivo.bitacora_logs?.length) {
      dates.push(...cultivo.bitacora_logs.map(log => new Date(log.created_at).getTime()));
    }
    
    if (cultivo.actions_logs?.length) {
      dates.push(...cultivo.actions_logs.map(log => new Date(log.created_at).getTime()));
    }
    
    // Si no hay actividad, usar la fecha de creación
    if (dates.length === 0 && cultivo.created_at) {
      return new Date(cultivo.created_at).getTime();
    }
    
    // Devolver la fecha más reciente o una fecha muy antigua si no hay fechas
    return dates.length > 0 ? Math.max(...dates) : 0;
  };
  
  // Función para formatear tiempo transcurrido desde una fecha
  const getTimeAgo = (timestamp) => {
    const now = new Date().getTime();
    const diffMs = now - timestamp;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffMonths > 0) {
      return `hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
    } else if (diffDays > 0) {
      return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    } else if (diffHours > 0) {
      return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    } else if (diffMinutes > 0) {
      return `hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
    } else {
      return 'hace un momento';
    }
  };
  
  // Verificar si un cultivo tiene actividad reciente
  const hasRecentActivity = (cultivo) => {
    return Boolean(cultivo.ambiente_logs?.length || cultivo.bitacora_logs?.length || cultivo.actions_logs?.length);
  };
  
  // Aplicar filtrado y búsqueda, luego ordenar por fecha de creación
  const filteredAndSortedCultivos = useMemo(() => {
    // Primero filtrar por tipo
    let filtered = cultivos;
    
    if (filterType === 'active') {
      filtered = cultivos.filter(cultivo => hasRecentActivity(cultivo));
    } else if (filterType === 'inactive') {
      filtered = cultivos.filter(cultivo => !hasRecentActivity(cultivo));
    }
    
    // Luego filtrar por término de búsqueda
    filtered = filtered.filter(cultivo => 
      cultivo.id.toString().includes(searchTerm.toLowerCase()) ||
      cultivo.tipo_cultivo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Preparar datos para ordenación con fecha calculada
    const withDates = filtered.map(cultivo => ({
      ...cultivo,
      _latestActivityTimestamp: getLatestActivityDate(cultivo)
    }));
    
    // Ordenar por fecha de creación (más reciente a más antigua)
    return withDates.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [cultivos, searchTerm, filterType]);

  // Efecto para validar la ordenación
  useEffect(() => {
    if (filteredAndSortedCultivos.length > 0) {
      console.log('Cultivos ordenados por actividad:');
      filteredAndSortedCultivos.forEach(cultivo => {
        console.log(`Cultivo #${cultivo.id}: ${new Date(cultivo._latestActivityTimestamp).toLocaleString()}`);
      });
    }
  }, [filteredAndSortedCultivos]);

  const showDeleteModal = (id) => {
    // Exponer la función al objeto window para mantener compatibilidad
    window.showDeleteModal(id);
  };

  return (
    <>
      {/* Search, filter and count section */}
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <input
              id="search-input"
              type="text"
              placeholder="Buscar cultivos..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter dropdown */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white appearance-none pr-10"
            >
              <option value="all">Todos los cultivos</option>
              <option value="active">Con actividad</option>
              <option value="inactive">Sin actividad</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="session-count">
          <p className="text-lg font-semibold text-gray-600">
            Total de cultivos: <span className="text-green-500">{filteredAndSortedCultivos.length}</span>
          </p>
        </div>
      </div>

      {/* Cultivos list */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Mis Cultivos</h2>
        
        {filteredAndSortedCultivos.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-lg font-medium text-gray-600 mb-2">No se encontraron cultivos</p>
            <p className="text-sm text-gray-500">Intente con otra búsqueda o cree un nuevo cultivo</p>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedCultivos.map((cultivo) => {
              const timeAgo = getTimeAgo(cultivo._latestActivityTimestamp);
              
              return (
                <li key={cultivo.id} className="bg-white rounded-xl shadow hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 hover:border-green-200">
                  <div className="relative">
                    {/* Banner con tipo de cultivo */}
                    <div className="absolute top-0 right-0 bg-custom-green text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                      {cultivo.tipo_cultivo || "Sin definir"}
                    </div>
                    
                    {/* Contenido principal */}
                    <div className="p-5">
                      {/* Cabecera */}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-800">Cultivo #{cultivo.id}</h3>
                        <span className="flex items-center text-gray-600 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                          {cultivo.config?.numPlantas ? `${cultivo.config.numPlantas} plantas` : "Plantas por definir"}
                        </span>
                      </div>
                      
                      {/* Detalles */}
                      <div className="space-y-2 mb-4">
                        {cultivo.created_at && (
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Creado:</span> {getTimeAgo(new Date(cultivo.created_at).getTime())}
                          </p>
                        )}
                        
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Espacio:</span> {
                            cultivo.config?.espacioAncho && cultivo.config?.espacioLargo 
                              ? `${cultivo.config.espacioAncho}×${cultivo.config.espacioLargo}cm`
                              : "Dimensiones por definir"
                          }
                        </p>
                        
                        {/* Badge con tiempo transcurrido desde la última actividad */}
                        <div className="flex items-center">
                          <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                            {hasRecentActivity(cultivo) ? `Última actividad: ${timeAgo}` : `Creado ${timeAgo}`}
                          </span>
                        </div>
                        
                        {/* Indicador de actividad */}
                        {hasRecentActivity(cultivo) ? (
                          <div className="flex items-center text-sm">
                            <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                            <span className="text-green-600">Actividad reciente</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-sm">
                            <span className="inline-block h-2 w-2 rounded-full bg-gray-300 mr-2"></span>
                            <span className="text-gray-500">Sin actividad reciente</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Botones de acción */}
                      <div className="flex gap-2">
                        <a href={`/cultivo/${cultivo.id}`} className="flex-1 bg-custom-green text-white text-center py-2 rounded-lg hover:bg-custom-green-dark transition-colors text-sm font-medium">
                          Ver detalles
                        </a>
                        <button
                          onClick={() => showDeleteModal(cultivo.id)}
                          className="flex items-center justify-center bg-white border border-red-500 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          title="Eliminar cultivo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
};

export default CultivosList; 