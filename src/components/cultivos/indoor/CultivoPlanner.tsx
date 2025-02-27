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
                <p className="text-red-600">
                    Error: El número de plantas ({formData.numPlantas}) excede la capacidad máxima del espacio ({formData.maxCapacity} plantas).
                    Por favor, reduce el número de plantas o aumenta el espacio de cultivo.
                </p>
            ) : (
                <>
                    <p className="text-green-600 mb-4">
                        ¡Las {formData.numPlantas} plantas caben en el espacio!
                        (Capacidad máxima: {formData.maxCapacity} plantas)
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

                            const left = formData.espacioEntreAncho + columna * (formData.maceteroAncho + formData.espacioEntreAncho);
                            const top = formData.espacioEntreLargo + fila * (formData.maceteroLargo + formData.espacioEntreLargo);

                            return (
                                <div
                                    key={maceta.id}
                                    className="absolute"
                                    style={{
                                        left: `${left}px`,
                                        top: `${top}px`,
                                        width: `${formData.maceteroAncho}px`,
                                        height: `${formData.maceteroLargo}px`,
                                        padding: '4px',
                                        borderRadius: '8px'
                                    }}
                                >
                                    <div className="relative w-full h-full">
                                        <div className="absolute inset-0 bg-brown-100 border-2 border-brown-300 rounded-md shadow-md">
                                            <div className="absolute inset-0 flex items-center justify-center text-3xl">
                                                🌱
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default CultivoPlanner; 