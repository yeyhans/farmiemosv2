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
    const [macetas, setMacetas] = useState<Maceta[]>(
        Array.from({ length: formData.numPlantas }, (_, i) => ({
            id: i,
            nombre: '',
            selected: false
        }))
    );
    const [showModal, setShowModal] = useState(false);
    const [nombreBase, setNombreBase] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [macetasParaActualizar, setMacetasParaActualizar] = useState<Maceta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPlant, setSelectedPlant] = useState<Maceta | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedPlant, setEditedPlant] = useState<Maceta | null>(null);

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
            const containerWidth = formData.plantasPorFila * formData.maceteroAncho + 
                (formData.plantasPorFila + 1) * formData.espacioEntreAncho;

            if (containerWidth > parentWidth) {
                const scale = parentWidth / containerWidth;
                container.style.setProperty('--scale-factor', scale.toString());
            } else {
                container.style.setProperty('--scale-factor', '1');
            }
        };

        adjustScale();
        window.addEventListener('resize', adjustScale);
        return () => window.removeEventListener('resize', adjustScale);
    }, [formData]);

    const toggleSeleccion = (id: number) => {
        const newMacetas = macetas.map(maceta => ({
            ...maceta,
            selected: maceta.id === id ? !maceta.selected : false
        }));
        setMacetas(newMacetas);
        
        // Actualizar la planta seleccionada
        const selected = newMacetas.find(m => m.selected);
        setSelectedPlant(selected || null);
    };

    const generarColorAleatorio = () => {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 50%)`;
    };

    const aplicarNombres = async () => {
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

        // Guardar en la base de datos
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
        } catch (error) {
            console.error('Error al guardar las plantas:', error);
            // Manejar el error apropiadamente
        }

        setShowModal(false);
        setShowConfirmModal(false);
        setMacetasParaActualizar([]);
        setNombreBase('');
    };

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

    const handleEdit = () => {
        setIsEditing(true);
        setEditedPlant(selectedPlant);
    };

    const handleSave = async () => {
        if (!editedPlant) return;

        try {
            const updatedMacetas = macetas.map(maceta => 
                maceta.id === editedPlant.id ? editedPlant : maceta
            );

            const response = await fetch('/api/cultivos/config-strain', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cultivoId: cultivoId,
                    strains: updatedMacetas
                })
            });

            if (!response.ok) throw new Error('Error al guardar los cambios');

            setMacetas(updatedMacetas);
            setSelectedPlant(editedPlant);
            setIsEditing(false);
            setEditedPlant(null);
        } catch (error) {
            console.error('Error al guardar los cambios:', error);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedPlant(null);
    };

    return (
        <div className="mt-8 flex flex-col lg:flex-row">
            {isLoading ? (
                <div className="w-full text-center py-8">
                    Cargando plantas...
                </div>
            ) : (
                <>
                    <div className="w-full lg:w-3/4">
                        <div
                            className="relative border-2 border-gray-300 bg-gray-100 mx-auto"
                            style={{
                                width: `${formData.plantasPorFila * formData.maceteroAncho + (formData.plantasPorFila + 1) * formData.espacioEntreAncho}px`,
                                height: `${formData.plantasPorColumna * formData.maceteroLargo + (formData.plantasPorColumna + 1) * formData.espacioEntreLargo}px`,
                                maxWidth: '100%',
                                transform: 'scale(var(--scale-factor, 1))',
                                transformOrigin: 'top left',
                            }}
                        >
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
                                                <div className="absolute -bottom-8 left-0 w-full text-center text-sm font-bold bg-white px-2 py-1 rounded shadow-sm">
                                                    {numero}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            
                        </div>
                    </div>
                    
                    {/* Panel de información */}
                    <div className="w-full lg:w-1/4 lg:ml-4 mt-4 lg:mt-0">
                        {selectedPlant ? (
                            <div className="bg-white p-4 rounded-lg shadow relative">
                                {!selectedPlant.color ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm rounded-lg">
                                        <div className="text-center space-y-2">
                                            <h3 className="text-sm font-semibold text-gray-700">¡Planta sin categorizar!</h3>
                                            <p className="text-xs text-gray-600 max-w-[200px]">
                                                Categoriza tu planta para poder editarla y ver toda su información
                                            </p>
                                        </div>
                                        <a 
                                            href={`/cultivo/${cultivoId}/indoor/strains`}
                                            className="flex items-center justify-center gap-1 bg-custom-green hover:bg-green-600 text-white font-medium text-xs py-2 px-3 rounded transition-colors"
                                        >
                                            Categorizar Planta
                                        </a>
                                    </div>
                                ) : (
                                    <div className="absolute top-4 right-4 space-x-2">
                                        {!isEditing ? (
                                            <button 
                                                onClick={handleEdit}
                                                className="text-gray-600 hover:text-gray-800"
                                            >
                                                ✏️
                                            </button>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={handleSave}
                                                    className="text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded"
                                                >
                                                    ✓
                                                </button>
                                                <button 
                                                    onClick={handleCancel}
                                                    className="text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded"
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                                <h3 className="text-lg font-semibold mb-4">Información de la Planta</h3>
                                <div className="space-y-2">
                                    <p>
                                        <span className="font-medium">ID:</span> {selectedPlant.id + 1}
                                    </p>
                                    {isEditing ? (
                                        <>
                                            <div>
                                                <span className="font-medium">Nombre:</span>{' '}
                                                <input
                                                    type="text"
                                                    value={editedPlant?.nombre || ''}
                                                    onChange={(e) => setEditedPlant(prev => prev ? {...prev, nombre: e.target.value} : null)}
                                                    className="border rounded px-2 py-1 ml-1"
                                                />
                                            </div>
                                            <div>
                                                <span className="font-medium">Cepa:</span>{' '}
                                                <input
                                                    type="text"
                                                    value={editedPlant?.nombreBase || ''}
                                                    onChange={(e) => setEditedPlant(prev => prev ? {...prev, nombreBase: e.target.value} : null)}
                                                    className="border rounded px-2 py-1 ml-1"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p>
                                                <span className="font-medium">Nombre:</span>{' '}
                                                {selectedPlant.nombre || 'Sin nombre'}
                                            </p>
                                            {selectedPlant.nombreBase && (
                                                <p>
                                                    <span className="font-medium">Cepa:</span>{' '}
                                                    {selectedPlant.nombreBase}
                                                </p>
                                            )}
                                        </>
                                    )}
                                    {selectedPlant.color && (
                                        <>
                                            <div className="flex items-center">
                                                <span className="font-medium mr-2">Color:</span>
                                                <div 
                                                    className="w-6 h-6 rounded-full"
                                                    style={{ backgroundColor: selectedPlant.color }}
                                                />
                                            </div>
                                            <a
                                                href={`/cultivo/${cultivoId}/indoor/strains/${selectedPlant.id}`}
                                                className="mt-4 block w-full bg-custom-green hover:bg-green-600 text-white text-center py-2 px-4 rounded transition-colors"
                                            >
                                                Ver detalles de la cepa
                                            </a>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-500 text-center">
                                Selecciona una planta para ver su información
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default StrainPlanner; 