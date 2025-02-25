import React, { useState, useEffect } from 'react';

interface Maceta {
    id: number;
    nombre: string;
    selected: boolean;
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

    const toggleSeleccion = (id: number) => {
        setMacetas(macetas.map(maceta => 
            maceta.id === id ? { ...maceta, selected: !maceta.selected } : maceta
        ));
    };

    const nombrarSeleccionadas = () => {
        if (!nombreBase.trim()) return;

        let contador = 1;
        setMacetas(macetas.map(maceta => {
            if (maceta.selected) {
                return {
                    ...maceta,
                    nombre: `${nombreBase} n${contador++}`,
                    selected: false
                };
            }
            return maceta;
        }));

        setShowModal(false);
        setNombreBase('');
    };

    const calculateMaxCapacity = () => {
        // Si las macetas son cuadradas (mismo ancho y largo)
        if (formData.maceteroAncho === formData.maceteroLargo) {
            // Aplicamos la fórmula (espacio/tamaño_maceta)^2
            const macetasPorLado = Math.floor(formData.espacioAncho / formData.maceteroAncho);
            return macetasPorLado * macetasPorLado;
        }
        
        // Si las macetas son rectangulares, mantener el cálculo original
        const maxFilas = Math.floor(formData.espacioLargo / (formData.maceteroLargo + formData.espacioEntreLargo));
        const maxColumnas = Math.floor(formData.espacioAncho / (formData.maceteroAncho + formData.espacioEntreAncho));
        return maxFilas * maxColumnas;
    };

    return (
        <div className="mt-8">
            {(!formData.numPlantas || 
              !formData.maceteroAncho || 
              !formData.maceteroLargo || 
              !formData.espacioAncho || 
              !formData.espacioLargo) ? (
                <p className="text-gray-600">
                    Por favor, completa todos los campos del formulario para visualizar la disposición.
                </p>
            ) : formData.numPlantas > calculateMaxCapacity() ? (
                <p className="text-red-600">
                    Error: El número de plantas ({formData.numPlantas}) excede la capacidad máxima del espacio ({calculateMaxCapacity()} plantas).
                    Por favor, reduce el número de plantas o aumenta el espacio de cultivo.
                </p>
            ) : (
                <>
                    <p className="text-green-600 mb-4">
                        ¡Las {formData.numPlantas} plantas caben en el espacio!
                        (Capacidad máxima: {calculateMaxCapacity()} plantas)
                    </p>

                    <div
                        className="relative border-2 border-gray-300 bg-gray-100"
                        style={{
                            width: `${formData.plantasPorFila * formData.maceteroAncho + (formData.plantasPorFila + 1) * formData.espacioEntreAncho}px`,
                            height: `${formData.plantasPorColumna * formData.maceteroLargo + (formData.plantasPorColumna + 1) * formData.espacioEntreLargo}px`,
                            margin: '40px auto'
                        }}
                    >
                        {macetas.map((maceta, index) => {
                            const columna = index % formData.plantasPorFila;
                            const fila = Math.floor(index / formData.plantasPorFila);

                            // Calculamos la posición con espaciado uniforme
                            const left = formData.espacioEntreAncho + columna * (formData.maceteroAncho + formData.espacioEntreAncho);
                            const top = formData.espacioEntreLargo + fila * (formData.maceteroLargo + formData.espacioEntreLargo);

                            return (
                                <div
                                    key={maceta.id}
                                    className={`absolute cursor-pointer hover:bg-green-100 transition-all duration-200 ${
                                        maceta.selected ? 'bg-green-50 ring-4 ring-green-500' : ''
                                    }`}
                                    style={{
                                        left: `${left}px`,
                                        top: `${top}px`,
                                        width: `${formData.maceteroAncho}px`,
                                        height: `${formData.maceteroLargo}px`,
                                        padding: '4px',
                                        borderRadius: '8px'
                                    }}
                                    onClick={() => toggleSeleccion(maceta.id)}
                                >
                                    <div className="relative w-full h-full">
                                        <div className="absolute inset-0 bg-brown-100 border-2 border-brown-300 rounded-md shadow-md">
                                            <div className="absolute inset-0 flex items-center justify-center text-3xl">
                                                🌱
                                            </div>
                                        </div>
                                        {maceta.nombre && (
                                            <div className="absolute -bottom-8 left-0 w-full text-center text-sm font-semibold bg-white px-2 py-1 rounded shadow-sm">
                                                {maceta.nombre}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bottom-4 right-4 space-x-2">
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded"
                        >
                            Nombrar Seleccionadas
                        </button>
                    </div>

                    {showModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <div className="bg-white p-6 rounded-lg shadow-xl">
                                <h3 className="text-lg font-bold mb-4">Nombrar Macetas Seleccionadas</h3>
                                <input
                                    type="text"
                                    className="border p-2 rounded w-full mb-4"
                                    placeholder="Nombre base para las plantas"
                                    value={nombreBase}
                                    onChange={(e) => setNombreBase(e.target.value)}
                                />
                                <p className="text-sm text-gray-600 mb-4">
                                    Se añadirá numeración automática (n1, n2, n3, etc.)
                                </p>
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
                </>
            )}
        </div>
    );
};

export default CultivoPlanner; 