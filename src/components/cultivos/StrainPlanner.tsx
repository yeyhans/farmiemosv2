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
}

interface Props {
    formData: FormData;
}

export const CultivoPlanner: React.FC<Props> = ({ formData: initialFormData }) => {
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

    const aplicarNombres = () => {
        const color = generarColorAleatorio();
        let contador = 1;
        setMacetas(macetas.map(maceta => {
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
        }));

        setShowModal(false);
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

    return (
        <div className="mt-8 flex flex-col lg:flex-row">
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
                <div className="mt-4 flex justify-center">
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-full shadow-lg"
                >
                    Nombrar
                </button>
                </div>
                
            </div>

            <div className="w-full lg:w-1/4 p-4">
                <h3 className="text-lg font-bold mb-4">Grupos de Plantas</h3>
                {Object.entries(gruposMacetas).map(([nombreBase, macetas]) => (
                    <div 
                        key={nombreBase} 
                        className="mb-4 p-3 rounded-lg shadow"
                        style={{ backgroundColor: macetas[0].color }}
                    >
                        <div className="bg-white bg-opacity-90 p-2 rounded">
                            <h4 className="font-semibold">{nombreBase}</h4>
                            <p className="text-sm">
                                Plantas: {macetas.map(m => m.nombre.split('n').pop()).join(', ')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>





            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Nombrar Macetas Seleccionadas</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre base para las plantas
                            </label>
                            <input
                                type="text"
                                className="border p-2 rounded w-full"
                                placeholder="Nombre base para las plantas"
                                value={nombreBase}
                                onChange={(e) => setNombreBase(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={nombrarSeleccionadas}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
};

export default CultivoPlanner; 