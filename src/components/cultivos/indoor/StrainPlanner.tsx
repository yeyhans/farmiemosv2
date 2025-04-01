import React, { useState, useEffect } from 'react';

interface Maceta {
    id: number;
    nombre: string;
    selected: boolean;
    color?: string;
    nombreBase?: string;
}

interface FormData {
    numPlantas: number;
    maceteroAncho: number;
    maceteroLargo: number;
    espacioAncho: number;
    espacioLargo: number;
    maxCapacity: number;
}

interface Props {
    formData: FormData;
    cultivoId: string;
}

export const StrainPlanner: React.FC<Props> = ({ formData: initialFormData, cultivoId }) => {
    const [formData, setFormData] = useState(() => {
        // Validar si tenemos todos los datos necesarios
        if (!initialFormData.numPlantas || 
            !initialFormData.maceteroAncho || 
            !initialFormData.maceteroLargo || 
            !initialFormData.espacioAncho || 
            !initialFormData.espacioLargo) {
            return initialFormData;
        }

        // Aumentamos el factor de escala para tener más espacio
        const espacioAncho = initialFormData.espacioAncho;
        const espacioLargo = initialFormData.espacioLargo;
        const maceteroAncho = initialFormData.maceteroAncho;
        const maceteroLargo = initialFormData.maceteroLargo;
        
        const plantasPorFila = Math.ceil(Math.sqrt(initialFormData.numPlantas));
        const plantasPorColumna = Math.ceil(initialFormData.numPlantas / plantasPorFila);
        
        // Aseguramos un espacio mínimo entre macetas
        const espacioEntreAncho = Math.max(
            (espacioAncho - (plantasPorFila * maceteroAncho)) / (plantasPorFila + 1),
            20
        );
        const espacioEntreLargo = Math.max(
            (espacioLargo - (plantasPorColumna * maceteroLargo)) / (plantasPorColumna + 1),
            20
        );
        
        return {
            ...initialFormData,
            espacioAncho,
            espacioLargo,
            maceteroAncho,
            maceteroLargo,
            espacioEntreAncho,
            espacioEntreLargo,
            plantasPorFila,
            plantasPorColumna
        };
    });
    const [macetas, setMacetas] = useState<Maceta[]>(() => 
        Array.from({ length: formData.numPlantas }, (_, i) => ({
            id: i,
            nombre: '',
            selected: false,
            color: undefined,
            nombreBase: undefined
        }))
    );
    const [showModal, setShowModal] = useState(false);
    const [nombreBase, setNombreBase] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [macetasParaActualizar, setMacetasParaActualizar] = useState<Maceta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDuplicateNameModal, setShowDuplicateNameModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);

    useEffect(() => {
        const handleUpdatePlanner = (event: CustomEvent<FormData>) => {
            const data = event.detail;
            const espacioAncho = data.espacioAncho;
            const espacioLargo = data.espacioLargo;
            const maceteroAncho = data.maceteroAncho;
            const maceteroLargo = data.maceteroLargo;
            
            const plantasPorFila = Math.ceil(Math.sqrt(data.numPlantas));
            const plantasPorColumna = Math.ceil(data.numPlantas / plantasPorFila);
            
            const espacioEntreAncho = Math.max(
                (espacioAncho - (plantasPorFila * maceteroAncho)) / (plantasPorFila + 1),
                20
            );
            const espacioEntreLargo = Math.max(
                (espacioLargo - (plantasPorColumna * maceteroLargo)) / (plantasPorColumna + 1),
                20
            );

            setFormData({
                ...data,
                espacioAncho,
                espacioLargo,
                maceteroAncho,
                maceteroLargo,
                espacioEntreAncho,
                espacioEntreLargo,
                plantasPorFila,
                plantasPorColumna
            });
            
            setMacetas(Array.from({ length: data.numPlantas }, (_, i) => ({
                id: i,
                nombre: '',
                selected: false
            })));
        };

        window.addEventListener('updatePlanner', handleUpdatePlanner as EventListener);
        return () => window.removeEventListener('updatePlanner', handleUpdatePlanner as EventListener);
    }, []);

    // Añadir useEffect para actualizar el estado cuando cambien los datos iniciales
    useEffect(() => {
        const espacioAncho = initialFormData.espacioAncho;
        const espacioLargo = initialFormData.espacioLargo;
        const maceteroAncho = initialFormData.maceteroAncho;
        const maceteroLargo = initialFormData.maceteroLargo;
        
        const plantasPorFila = Math.ceil(Math.sqrt(initialFormData.numPlantas));
        const plantasPorColumna = Math.ceil(initialFormData.numPlantas / plantasPorFila);
        
        const espacioEntreAncho = Math.max(
            (espacioAncho - (plantasPorFila * maceteroAncho)) / (plantasPorFila + 1),
            20
        );
        const espacioEntreLargo = Math.max(
            (espacioLargo - (plantasPorColumna * maceteroLargo)) / (plantasPorColumna + 1),
            20
        );

        setFormData({
            ...initialFormData,
            espacioAncho,
            espacioLargo,
            maceteroAncho,
            maceteroLargo,
            espacioEntreAncho,
            espacioEntreLargo,
            plantasPorFila,
            plantasPorColumna
        });

        setMacetas(Array.from({ length: initialFormData.numPlantas }, (_, i) => ({
            id: i,
            nombre: '',
            selected: false
        })));
    }, [initialFormData]);

    useEffect(() => {
        const adjustScale = () => {
            const container = document.querySelector('.relative.border-2') as HTMLElement;
            if (!container) return;

            const parentWidth = container.parentElement?.clientWidth || window.innerWidth;
            const parentHeight = window.innerHeight * 0.6; // Limitar altura máxima en móviles
            
            const containerWidth = formData.plantasPorFila * formData.maceteroAncho + 
                (formData.plantasPorFila + 1) * formData.espacioEntreAncho;
            const containerHeight = formData.plantasPorColumna * formData.maceteroLargo + 
                (formData.plantasPorColumna + 1) * formData.espacioEntreLargo;

            // Calcular escalas para ancho y alto
            const scaleWidth = parentWidth / containerWidth;
            const scaleHeight = parentHeight / containerHeight;
            
            // Usar la escala más pequeña para mantener las proporciones
            const scale = Math.min(scaleWidth, scaleHeight, 1);
            
            container.style.setProperty('--scale-factor', scale.toString());
            
            // Asegurar que el contenedor está centrado
            container.style.transformOrigin = 'top center';
        };

        adjustScale();
        window.addEventListener('resize', adjustScale);
        return () => window.removeEventListener('resize', adjustScale);
    }, [formData]);

    const toggleSeleccion = (id: number) => {
        setMacetas(macetas.map(maceta => 
            maceta.id === id ? { ...maceta, selected: !maceta.selected } : maceta
        ));
    };

    const nombrarSeleccionadas = () => {
        if (!nombreBase.trim()) return;

        // Encontrar macetas seleccionadas que ya tienen nombre
        const macetasConNombre = macetas.filter(maceta => 
            maceta.selected && maceta.nombre
        );

        if (macetasConNombre.length > 0) {
            // Guardar las macetas que necesitan actualización para usar después
            setMacetasParaActualizar(macetas);
            setShowConfirmModal(true);
            return;
        }

        aplicarNombres();
    };

    const generarColorAleatorio = () => {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 50%)`;
    };

    const aplicarNombres = async () => {
        // Verificar nuevamente si el nombreBase ya existe
        const nombreBaseExistente = Object.keys(gruposMacetas).some(
            existingName => existingName.toLowerCase() === nombreBase.toLowerCase()
        );

        if (nombreBaseExistente) {
            setShowDuplicateNameModal(true);
            setShowConfirmModal(false);
            return;
        }

        const color = generarColorAleatorio();
        let contador = 1;
        const nuevasMacetas = macetas.map(maceta => {
            if (maceta.selected) {
                return {
                    ...maceta,
                    nombre: `${nombreBase} n${contador++}`,
                    nombreBase: nombreBase,
                    color: color,
                    selected: false
                };
            }
            return maceta;
        });

        setMacetas(nuevasMacetas);

        try {
            const response = await fetch('/api/cultivos/config-strain', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cultivoId: cultivoId,
                    strains: nuevasMacetas
                })
            });

            if (!response.ok) {
                throw new Error('Error al guardar las plantas');
            }

            // Mostrar alerta de éxito
            setShowSuccessAlert(true);
            setTimeout(() => setShowSuccessAlert(false), 3000);
        } catch (error) {
            console.error('Error al guardar las plantas:', error);
        }

        setShowConfirmModal(false);
        setMacetasParaActualizar([]);
        setNombreBase('');
    };

    // Agrupar macetas por nombreBase
    const gruposMacetas = macetas.reduce((grupos: { [key: string]: Maceta[] }, maceta) => {
        if (maceta.nombreBase) {
            if (!grupos[maceta.nombreBase]) {
                grupos[maceta.nombreBase] = [];
            }
            grupos[maceta.nombreBase].push(maceta);
        }
        return grupos;
    }, {});

    // Modificar el useEffect de carga de datos
    useEffect(() => {
        const cargarDatos = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/cultivos/config-strain?cultivoId=${cultivoId}`);
                if (!response.ok) {
                    throw new Error('Error al cargar los datos');
                }
                const { success, data } = await response.json();
                if (success && data && Array.isArray(data)) {
                    // Asegurarse de que los datos mantengan la estructura correcta
                    const macetasActualizadas = data.map(maceta => ({
                        ...maceta,
                        selected: false // Asegurarse de que selected esté definido
                    }));
                    setMacetas(macetasActualizadas);
                }
            } catch (error) {
                console.error('Error al cargar los datos:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (cultivoId) {
            cargarDatos();
        }
    }, [cultivoId]);

    const startEditingGroup = (nombreBase: string) => {
        setEditingGroup(nombreBase);
        
        // Marcar como seleccionadas todas las plantas que pertenecen a este grupo
        setMacetas(macetas.map(maceta => ({
            ...maceta,
            selected: maceta.nombreBase === nombreBase
        })));
    };

    const finishEditing = async () => {
        if (!editingGroup) return;
        
        // Obtener las plantas seleccionadas
        const plantasSeleccionadas = macetas.filter(maceta => maceta.selected);
        
        // Obtener las plantas que ya pertenecen a este grupo
        const plantasDelGrupo = macetas.filter(maceta => maceta.nombreBase === editingGroup);
        
        // Identificar plantas a añadir (seleccionadas pero no en el grupo)
        const plantasNuevas = plantasSeleccionadas.filter(maceta => 
            !plantasDelGrupo.some(p => p.id === maceta.id)
        );
        
        // Identificar plantas a quitar (en el grupo pero no seleccionadas)
        const plantasAQuitar = plantasDelGrupo.filter(maceta => 
            !plantasSeleccionadas.some(p => p.id === maceta.id)
        );
        
        // Aplicar los cambios
        const color = plantasDelGrupo[0]?.color || generarColorAleatorio();
        const nuevasMacetas = macetas.map(maceta => {
            // Añadir plantas nuevas al grupo
            if (plantasNuevas.some(p => p.id === maceta.id)) {
                return {
                    ...maceta,
                    nombre: `${editingGroup} n${plantasDelGrupo.length + plantasNuevas.indexOf(maceta) + 1}`,
                    nombreBase: editingGroup,
                    color: color,
                    selected: false
                };
            }
            // Quitar plantas del grupo
            else if (plantasAQuitar.some(p => p.id === maceta.id)) {
                return {
                    ...maceta,
                    nombre: '',
                    nombreBase: undefined,
                    color: undefined,
                    selected: false
                };
            }
            // Deseleccionar todas las plantas
            return {
                ...maceta,
                selected: false
            };
        });

        setMacetas(nuevasMacetas);
        
        // Guardar cambios en la BD
        try {
            const response = await fetch('/api/cultivos/config-strain', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cultivoId: cultivoId,
                    strains: nuevasMacetas
                })
            });

            if (!response.ok) {
                throw new Error('Error al guardar los cambios');
            }
        } catch (error) {
            console.error('Error al guardar los cambios:', error);
        }
        
        setEditingGroup(null);
    };

    return (
        <div className="mt-8 flex flex-col lg:flex-row">
            {isLoading ? (
                <div className="w-full text-center py-8">
                    Cargando plantas...
                </div>
            ) : (
                <div className="w-full overflow-auto pb-4">
                    <div className="flex justify-center">
                        <div className="relative border-2 rounded-lg bg-gray-100 mx-auto mb-10 md:mb-4" style={{
                            width: `${formData.plantasPorFila * formData.maceteroAncho + (formData.plantasPorFila + 1) * formData.espacioEntreAncho}px`,
                            height: `${formData.plantasPorColumna * formData.maceteroLargo + (formData.plantasPorColumna + 1) * formData.espacioEntreLargo}px`,
                            transform: 'scale(var(--scale-factor, 1))',
                            transformOrigin: 'top center',
                            margin: '0 auto',
                            maxWidth: '100%',
                            touchAction: 'pan-x pan-y', // Mejorar interacción táctil
                        }}>
                            {macetas.map((maceta, index) => {
                                const columna = index % formData.plantasPorFila;
                                const fila = Math.floor(index / formData.plantasPorFila);
                                const left = formData.espacioEntreAncho + columna * (formData.maceteroAncho + formData.espacioEntreAncho);
                                const top = formData.espacioEntreLargo + fila * (formData.maceteroLargo + formData.espacioEntreLargo);
                                const numero = maceta.nombre ? maceta.nombre.split('n').pop() : '';

                                return (
                                    <div
                                        key={maceta.id}
                                        className={`absolute cursor-pointer hover:bg-green-100 transition-all duration-200 ${
                                            maceta.selected ? 'ring-4 ring-green-500' : ''
                                        }`}
                                        style={{
                                            left: `${left}px`,
                                            top: `${top}px`,
                                            width: `${formData.maceteroAncho}px`,
                                            height: `${formData.maceteroLargo}px`,
                                            padding: '4px',
                                            borderRadius: '8px',
                                            backgroundColor: maceta.color || 'transparent'
                                        }}
                                        onClick={() => toggleSeleccion(maceta.id)}
                                    >
                                        <div className="relative w-full h-full">
                                            <div className="absolute inset-0 bg-white bg-opacity-50 border-2 border-brown-300 rounded-md shadow-md">
                                                <div className="absolute inset-0 flex items-center justify-center text-3xl">
                                                    🌱
                                                </div>
                                            </div>
                                            {numero && (
                                                <div className="absolute bottom-0 left-0 w-full text-center text-xs md:text-sm font-bold bg-white bg-opacity-90 px-1 py-0.5 rounded">
                                                    {numero}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}                    
                        </div>
                    </div>

                    {/* Formulario de nombrado cuando hay selección */}
                    {macetas.some(maceta => maceta.selected) && !editingGroup && (
                        <div className="mt-4 bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Nombrar plantas seleccionadas
                                </h3>
                                <span className="text-sm text-green-600 font-medium">
                                    {macetas.filter(m => m.selected).length} plantas seleccionadas
                                </span>
                            </div>

                            {/* Lista de plantas seleccionadas */}
                            <div className="mb-4 bg-gray-50 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Plantas seleccionadas:</h4>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {macetas.filter(m => m.selected).map((maceta, index) => (
                                        <div key={maceta.id} className="flex items-center justify-between text-sm bg-white p-2 rounded shadow-sm">
                                            <div className="flex items-center space-x-2">
                                                <span className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-800 rounded-full font-medium">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    {maceta.nombre ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-900">{maceta.nombre}</span>
                                                            <span className="text-xs text-red-500">
                                                                Se sobreescribirá el nombre actual
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500 italic">Sin nombre asignado</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleSeleccion(maceta.id)}
                                                className="text-gray-400 hover:text-gray-600"
                                                title="Quitar de la selección"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="nombreBase" className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre base para el grupo
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            id="nombreBase"
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm"
                                            placeholder="Ingresa el nombre base"
                                            value={nombreBase}
                                            onChange={(e) => setNombreBase(e.target.value)}
                                        />
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Se añadirá numeración automática (n1, n2, n3, etc.)
                                    </p>
                                    {nombreBase.trim() && (
                                        <div className="mt-2 text-sm text-gray-600">
                                            <p>Vista previa:</p>
                                            <div className="mt-1 flex gap-2 flex-wrap">
                                                {macetas.filter(m => m.selected).map((_, index) => (
                                                    <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        {`${nombreBase} n${index + 1}`}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex space-x-3 pt-2">
                                    <button 
                                        onClick={() => {
                                            setMacetas(macetas.map(maceta => ({...maceta, selected: false})));
                                            setNombreBase('');
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        Cancelar selección
                                    </button>
                                    <button 
                                        onClick={nombrarSeleccionadas}
                                        disabled={!nombreBase.trim()}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium text-white 
                                            ${nombreBase.trim() 
                                                ? 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500' 
                                                : 'bg-green-400 cursor-not-allowed'}`}
                                    >
                                        Nombrar plantas
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="w-full lg:w-1/4 lg:ml-4 mt-4 lg:mt-0 pb-20">
                <h3 className="text-lg font-bold text-center whitespace-nowrap overflow-hidden text-ellipsis">Grupos de Plantas</h3>
                <p className="text-sm text-gray-500 px-2 text-center">
                    {Object.keys(gruposMacetas).length} grupos registrados
                </p>
                {Object.keys(gruposMacetas).length === 0 ? (
                    <div className="text-center p-4 bg-gray-50 rounded-lg text-gray-500">
                        No hay grupos de plantas definidos
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-1 gap-3 px-2 justify-items-center">
                            {Object.entries(gruposMacetas)
                                .slice((currentPage - 1) * 2, currentPage * 2)
                                .map(([nombreBase, macetas]) => (
                                    <div 
                                        key={nombreBase} 
                                        className="rounded-lg transform transition-transform hover:scale-102"
                                    >
                                        <div 
                                            className="p-4 rounded-lg shadow-md relative overflow-hidden h-[160px] w-[320px] flex flex-col"
                                            style={{ 
                                                backgroundColor: macetas[0].color,
                                                color: '#000',
                                            }}
                                        >
                                            <div className="bg-white bg-opacity-80 px-3 py-2 rounded-md flex-grow flex flex-col">
                                                <h3 className="text-sm font-medium text-gray-700">{nombreBase}</h3>
                                                <div className="mt-3 flex flex-wrap gap-2 overflow-y-auto max-h-[80px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-1">
                                                    {macetas.map(m => (
                                                        <a
                                                            key={m.id}
                                                            href={`/cultivo/${cultivoId}/indoor/strains/${m.id}`}
                                                            className="group relative inline-flex items-center justify-center bg-white/95 hover:bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:text-gray-900 rounded-lg ring-1 ring-gray-200 hover:ring-gray-300 shadow-sm transition-all duration-200 ease-in-out"
                                                        >
                                                            <span className="mr-1 text-xs text-gray-400 font-normal">{nombreBase}</span>
                                                            <span className="font-semibold">{m.nombre.split('n').pop()}</span>
                                                            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 bg-gradient-to-r from-green-50 to-transparent transition-opacity duration-200"/>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                        
                        {/* Controles de paginación mejorados */}
                        <div className="flex justify-center mt-6 px-2">
                            <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 p-1">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                        currentPage === 1 
                                            ? 'text-gray-300 cursor-not-allowed' 
                                            : 'text-gray-600 hover:bg-green-50 hover:text-green-600 active:bg-green-100'
                                    }`}
                                    aria-label="Página anterior"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                                    </svg>
                                </button>
                                
                                <div className="px-3 text-sm font-medium text-gray-700">
                                    <span className="text-green-600 font-semibold">{currentPage}</span>
                                    <span className="mx-1">/</span>
                                    <span>{Math.max(1, Math.ceil(Object.keys(gruposMacetas).length / 2))}</span>
                                </div>
                                
                                <button 
                                    onClick={() => setCurrentPage(prev => 
                                        Math.min(prev + 1, Math.ceil(Object.keys(gruposMacetas).length / 2))
                                    )}
                                    disabled={currentPage >= Math.ceil(Object.keys(gruposMacetas).length / 2) || Object.keys(gruposMacetas).length <= 2}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                        currentPage >= Math.ceil(Object.keys(gruposMacetas).length / 2) || Object.keys(gruposMacetas).length <= 2
                                            ? 'text-gray-300 cursor-not-allowed' 
                                            : 'text-gray-600 hover:bg-green-50 hover:text-green-600 active:bg-green-100'
                                    }`}
                                    aria-label="Página siguiente"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        

                    </>
                )}
            </div>

            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Confirmar sobreescritura</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Algunas plantas seleccionadas ya tienen nombre. ¿Deseas sobreescribir sus nombres?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setMacetasParaActualizar([]);
                                }}
                                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={aplicarNombres}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Sobreescribir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDuplicateNameModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Nombre duplicado</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            El nombre base ya existe en los grupos de plantas. Por favor, elige otro nombre.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowDuplicateNameModal(false);
                                    setShowConfirmModal(false);
                                }}
                                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccessAlert && (
                <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out">
                    <div className="flex items-center space-x-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Plantas registradas exitosamente</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrainPlanner; 