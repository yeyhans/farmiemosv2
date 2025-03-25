import React, { useState, useEffect } from 'react';

interface Maceta {
    id: number;
    nombre: string;
}

interface FormData {
    numPlantas: number;
    maceteroAncho: number;
    maceteroLargo: number;
    espacioAncho: number;
    espacioLargo: number;
    maxCapacity?: number;
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
            nombre: ''
        }))
    );

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
                nombre: ''
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
            nombre: ''
        })));
    }, [initialFormData]);

    // Función para calcular la escala de visualización
    const getScaleFactor = () => {
        // Calculamos el ancho y alto total real del espacio
        const anchoTotal = formData.plantasPorFila * formData.maceteroAncho + 
                          (formData.plantasPorFila + 1) * formData.espacioEntreAncho;
        const altoTotal = formData.plantasPorColumna * formData.maceteroLargo + 
                         (formData.plantasPorColumna + 1) * formData.espacioEntreLargo;
        
        // Definimos un tamaño máximo para la visualización
        const maxVisualizationWidth = 700;
        const maxVisualizationHeight = 500;
        
        // Calculamos factores de escala para ancho y alto
        const scaleFactorWidth = maxVisualizationWidth / anchoTotal;
        const scaleFactorHeight = maxVisualizationHeight / altoTotal;
        
        // Usamos el menor para mantener la proporción
        return Math.min(scaleFactorWidth, scaleFactorHeight, 1); // No agrandamos si es menor
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
            ) : formData.numPlantas > (formData.maxCapacity || 0) ? (
                <>
                    <div className="bg-red-50 border border-red-400 rounded-lg text-red-800 p-3 mb-4 shadow-sm mx-2 sm:mx-0" role="alert">
                        <div className="flex items-start">
                            <svg className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="text-sm">
                                <p className="font-semibold text-red-900 mb-0.5">Error de capacidad</p>
                                <p className="text-red-700 leading-tight">
                                    El número de plantas ({formData.numPlantas}) excede la capacidad máxima ({formData.maxCapacity}).
                                </p>
                                <p className="text-red-600 text-xs mt-1 leading-snug">
                                    Reduce el número de plantas, ajusta el tamaño de macetas o aumenta el espacio.
                                </p>
                            </div>
                        </div>
                    </div>
                    {(() => {
                        // Calculamos los valores a escala
                        const scaleFactor = getScaleFactor();
                        const anchoTotal = (formData.plantasPorFila * formData.maceteroAncho + 
                                          (formData.plantasPorFila + 1) * formData.espacioEntreAncho) * scaleFactor;
                        const altoTotal = (formData.plantasPorColumna * formData.maceteroLargo + 
                                         (formData.plantasPorColumna + 1) * formData.espacioEntreLargo) * scaleFactor;
                        
                        // Valores reales para mostrar en la leyenda
                        const anchoRealCm = formData.espacioAncho;
                        const altoRealCm = formData.espacioLargo;
                        
                        return (
                            <div className="flex flex-col items-center">
                                <div className="text-sm text-gray-600 mb-2">
                                    {scaleFactor < 1 ? 
                                        `Visualización a escala (${Math.round(scaleFactor * 100)}% del tamaño real)` : 
                                        'Visualización a tamaño real'}
                                </div>
                                <div className="flex justify-center items-center mb-2">
                                    <div className="text-xs text-gray-500 mr-2">Dimensiones reales: {anchoRealCm}cm × {altoRealCm}cm</div>
                                </div>
                                <div
                                    className="relative border-2 border-gray-300 bg-gray-100"
                                    style={{
                                        width: `${anchoTotal}px`,
                                        height: `${altoTotal}px`,
                                        margin: '20px auto'
                                    }}
                                >
                                    {macetas.map((maceta, index) => {
                                        const columna = index % formData.plantasPorFila;
                                        const fila = Math.floor(index / formData.plantasPorFila);

                                        const left = (formData.espacioEntreAncho + columna * 
                                                    (formData.maceteroAncho + formData.espacioEntreAncho)) * scaleFactor;
                                        const top = (formData.espacioEntreLargo + fila * 
                                                   (formData.maceteroLargo + formData.espacioEntreLargo)) * scaleFactor;

                                        return (
                                            <div
                                                key={maceta.id}
                                                className="absolute"
                                                style={{
                                                    left: `${left}px`,
                                                    top: `${top}px`,
                                                    width: `${formData.maceteroAncho * scaleFactor}px`,
                                                    height: `${formData.maceteroLargo * scaleFactor}px`,
                                                    padding: `${4 * scaleFactor}px`,
                                                    borderRadius: `${8 * scaleFactor}px`
                                                }}
                                            >
                                                <div className="relative w-full h-full">
                                                    <div className="absolute inset-0 bg-brown-100 border-2 border-brown-300 rounded-md shadow-md">
                                                        <div className="absolute inset-0 flex items-center justify-center" 
                                                             style={{ fontSize: `${Math.max(16 * scaleFactor, 12)}px` }}>
                                                            🌱
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </>
            ) : (
                <>
                    <div className="bg-green-50 border border-green-400 rounded-lg text-green-800 p-3 mb-4 shadow-sm mx-2 sm:mx-0" role="alert">
                        <div className="flex items-start">
                            <svg className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <div className="text-sm">
                                <p className="font-semibold text-green-900 mb-0.5">¡Configuración válida!</p>
                                <p className="text-green-700 leading-tight">
                                    Las {formData.numPlantas} plantas caben perfectamente en el espacio.
                                </p>
                                <p className="text-green-600 text-xs mt-1 leading-snug">
                                    Capacidad máxima del espacio: {formData.maxCapacity} plantas
                                </p>
                            </div>
                        </div>
                    </div>

                    {(() => {
                        // Calculamos los valores a escala
                        const scaleFactor = getScaleFactor();
                        const anchoTotal = (formData.plantasPorFila * formData.maceteroAncho + 
                                          (formData.plantasPorFila + 1) * formData.espacioEntreAncho) * scaleFactor;
                        const altoTotal = (formData.plantasPorColumna * formData.maceteroLargo + 
                                         (formData.plantasPorColumna + 1) * formData.espacioEntreLargo) * scaleFactor;
                        
                        // Valores reales para mostrar en la leyenda
                        const anchoRealCm = formData.espacioAncho;
                        const altoRealCm = formData.espacioLargo;
                        
                        return (
                            <div className="flex flex-col items-center">
                                <div className="text-sm text-gray-600 mb-2">
                                    {scaleFactor < 1 ? 
                                        `Visualización a escala (${Math.round(scaleFactor * 100)}% del tamaño real)` : 
                                        'Visualización a tamaño real'}
                                </div>
                                <div className="flex justify-center items-center mb-2">
                                    <div className="text-xs text-gray-500 mr-2">Dimensiones reales: {anchoRealCm}cm × {altoRealCm}cm</div>
                                </div>
                                <div
                                    className="relative border-2 border-gray-300 bg-gray-100"
                                    style={{
                                        width: `${anchoTotal}px`,
                                        height: `${altoTotal}px`,
                                        margin: '20px auto'
                                    }}
                                >
                                    {macetas.map((maceta, index) => {
                                        const columna = index % formData.plantasPorFila;
                                        const fila = Math.floor(index / formData.plantasPorFila);

                                        const left = (formData.espacioEntreAncho + columna * 
                                                    (formData.maceteroAncho + formData.espacioEntreAncho)) * scaleFactor;
                                        const top = (formData.espacioEntreLargo + fila * 
                                                   (formData.maceteroLargo + formData.espacioEntreLargo)) * scaleFactor;

                                        return (
                                            <div
                                                key={maceta.id}
                                                className="absolute"
                                                style={{
                                                    left: `${left}px`,
                                                    top: `${top}px`,
                                                    width: `${formData.maceteroAncho * scaleFactor}px`,
                                                    height: `${formData.maceteroLargo * scaleFactor}px`,
                                                    padding: `${4 * scaleFactor}px`,
                                                    borderRadius: `${8 * scaleFactor}px`
                                                }}
                                            >
                                                <div className="relative w-full h-full">
                                                    <div className="absolute inset-0 bg-brown-100 border-2 border-brown-300 rounded-md shadow-md">
                                                        <div className="absolute inset-0 flex items-center justify-center" 
                                                             style={{ fontSize: `${Math.max(16 * scaleFactor, 12)}px` }}>
                                                            🌱
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </>
            )}
        </div>
    );
};

export default CultivoPlanner; 