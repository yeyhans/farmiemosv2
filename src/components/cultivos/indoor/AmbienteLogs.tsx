import React, { useState, useEffect, useCallback } from 'react';
import AmbienteBitacoraLogs from './AmbienteBitacoraLogs';
import AccionesCalculator from './AccionesCalculator';

interface AmbienteLog {
  timestamp: string;
  temperatura: number;
  humedad: number;
  vpd: number;
  dewpoint: number;
}

interface Ambiente {
  logs: AmbienteLog[];
  configuracion: any;
}

interface Props {
  cultivoId: string;
  user_id: string;
  ambiente_logs: AmbienteLog[];
}

export default function AmbienteLogs({ cultivoId, user_id, ambiente_logs }: Props) {
  const [ambiente, setAmbiente] = useState<Ambiente>({ 
    logs: ambiente_logs || [],
    configuracion: {} 
  });
  
  const [formData, setFormData] = useState({
    user_id: user_id,
    temperatura: '',
    humedad: '',
  });

  const [calculosEnVivo, setCalculosEnVivo] = useState({
    vpd: 0,
    dewpoint: 0,
  });

  const [showBitacora, setShowBitacora] = useState(false);
  const [showAcciones, setShowAcciones] = useState(false);
  
  // Añadir estado para el filtro de semana
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12; // Convertir a formato 12 horas
    
    return {
      hours: String(hours12).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      period
    };
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Función para obtener los días de la semana actual
  const getWeekDays = useCallback((date: Date) => {
    const day = date.getDay(); // 0 es domingo, 1 es lunes, etc.
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
    
    const monday = new Date(date);
    monday.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      weekDays.push(nextDay);
    }
    
    return weekDays;
  }, []);
  
  // Función para cambiar a la semana anterior
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };
  
  // Función para cambiar a la semana siguiente
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };
  
  // Función para formatear la fecha
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      day: 'numeric',
      month: 'short'
    });
  };
  
  // Verificar si una fecha es hoy
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };
  
  // Verificar si una fecha está seleccionada
  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  // Memoizar funciones de cálculo
  const calcularVPD = useCallback((temp: number, hum: number) => {
    const a = 17.27, b = 237.7;
    const es = 0.6108 * Math.exp((a * temp) / (b + temp));
    const ea = es * (hum / 100);
    return es - ea;
  }, []);

  const calcularDewpoint = useCallback((temp: number, hum: number) => {
    const a = 17.27, b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(hum / 100);
    return (b * alpha) / (a - alpha);
  }, []);

  // Efecto para cálculos en vivo
  useEffect(() => {
    const temp = parseFloat(formData.temperatura);
    const hum = parseFloat(formData.humedad);

    if (!isNaN(temp) && !isNaN(hum) && hum >= 0 && hum <= 100) {
      const vpd = calcularVPD(temp, hum);
      const dewpoint = calcularDewpoint(temp, hum);
      setCalculosEnVivo({
        vpd: Number(vpd.toFixed(2)),
        dewpoint: Number(dewpoint.toFixed(2))
      });
    } else {
      setCalculosEnVivo({ vpd: 0, dewpoint: 0 });
    }
  }, [formData, calcularVPD, calcularDewpoint]);

  // Actualizar la función para obtener la fecha y hora completa
  const getSelectedDateTime = useCallback(() => {
    const dateTime = new Date(selectedDate);
    
    // Si no se muestra el selector de hora, usar la hora actual
    if (!showTimePicker) {
      const now = new Date();
      dateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
      return dateTime;
    }
    
    // Si se usa el selector de hora, convertir de formato 12 horas a 24 horas
    let hours = parseInt(selectedTime.hours);
    const minutes = parseInt(selectedTime.minutes);
    
    // Ajustar las horas según AM/PM
    if (selectedTime.period === 'PM' && hours < 12) {
      hours += 12;
    } else if (selectedTime.period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  }, [selectedDate, selectedTime, showTimePicker]);

  // Manejar cambios en los campos de hora, minutos y periodo
  const handleTimeChange = (field: 'hours' | 'minutes' | 'period', value: string) => {
    const newSelectedTime = {...selectedTime, [field]: value};
    setSelectedTime(newSelectedTime);
    
    // Broadcast time changes
    const timeChangeEvent = new CustomEvent('ambiente-time-changed', {
      detail: { 
        selectedTime: newSelectedTime,
        cultivoId,
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(timeChangeEvent);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convertir comas a puntos para decimales
    const sanitizedValue = value.replace(/,/g, '.');
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
    
    // Broadcast changes in real-time
    const ambienteInputEvent = new CustomEvent('ambiente-input-changed', {
      detail: { 
        field: name, 
        value: sanitizedValue,
        formData: {...formData, [name]: sanitizedValue},
        cultivoId,
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(ambienteInputEvent);
  };

  // Add this useEffect to listen for input changes from other instances
  useEffect(() => {
    const handleInputUpdate = (event: CustomEvent<any>) => {
      const { field, value, cultivoId: updatedCultivoId } = event.detail;
      
      // Only update if it's for the same cultivo and not triggered by this component
      if (updatedCultivoId === cultivoId && event.target !== window) {
        setFormData(prev => ({ ...prev, [field]: value }));
      }
    };
    
    window.addEventListener('ambiente-input-changed', handleInputUpdate as EventListener);
    
    return () => {
      window.removeEventListener('ambiente-input-changed', handleInputUpdate as EventListener);
    };
  }, [cultivoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const temp = parseFloat(formData.temperatura);
    const hum = parseFloat(formData.humedad);
    
    if (isNaN(temp) || isNaN(hum)) return;

    // Usar la fecha y hora seleccionadas
    const selectedDateTime = getSelectedDateTime();
    
    const newLog: AmbienteLog = {
      timestamp: selectedDateTime.toISOString(),
      temperatura: temp,
      humedad: hum,
      vpd: calculosEnVivo.vpd,
      dewpoint: calculosEnVivo.dewpoint
    };

    try {
      const response = await fetch('/api/cultivos/ambiente-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cultivoId: cultivoId,
          ambiente_logs: [...ambiente.logs, newLog]
        })
      });

      if (response.ok) {
        const updatedLogs = [...ambiente.logs, newLog];
        setAmbiente(prev => ({
          ...prev,
          logs: updatedLogs
        }));
        
        // Emitir eventos personalizados para actualizar otros componentes
        
        // 1. Evento para actualizar gráficos y vistas de ambiente
        const ambienteUpdateEvent = new CustomEvent('ambiente-logs-updated', {
          detail: { 
            logs: updatedLogs,
            newLog,
            timestamp: selectedDateTime.toISOString(),
            cultivoId
          }
        });
        
        // 2. Evento general para cualquier componente que necesite actualizarse
        const globalUpdateEvent = new CustomEvent('cultivo-data-updated', {
          detail: {
            type: 'ambiente',
            logs: updatedLogs,
            newLog,
            timestamp: selectedDateTime.toISOString(),
            cultivoId,
            selectedDate: selectedDateTime
          }
        });
        
        // Disparar ambos eventos
        window.dispatchEvent(ambienteUpdateEvent);
        window.dispatchEvent(globalUpdateEvent);
        
        setFormData({ user_id, temperatura: '', humedad: '' });
      } else {
        const errorData = await response.json();
        console.error('Error en la respuesta:', errorData);
      }
    } catch (error) {
      console.error('Error al guardar el log:', error);
    }
  };



  return (
    <div className="space-y-4 mt-8">
      {/* Filtro de semana */}
      <div className="bg-white rounded-lg shadow p-2 mb-4">
        <div className="flex justify-between items-center mb-2">
          <button 
            onClick={goToPreviousWeek}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="text-sm font-medium text-gray-700">
            {`${formatDate(getWeekDays(currentDate)[0])} - ${formatDate(getWeekDays(currentDate)[6])}`}
          </div>
          
          <button 
            onClick={goToNextWeek}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {getWeekDays(currentDate).map((date, index) => (
            <button
              key={index}
              onClick={() => setSelectedDate(date)}
              className={`
                py-1 px-1 text-xs rounded-md flex flex-col items-center justify-center
                ${isToday(date) ? 'bg-blue-100 text-blue-800' : ''}
                ${isSelected(date) && !isToday(date) ? 'bg-green-100 text-green-800' : ''}
                ${!isSelected(date) && !isToday(date) ? 'hover:bg-gray-100' : ''}
              `}
            >
              <span className="font-medium">{date.getDate()}</span>
              <span className="text-[10px]">
                {date.toLocaleDateString('es-ES', { weekday: 'short' })}
              </span>
            </button>
          ))}
        </div>
        
        {/* Selector de hora para cualquier día */}
        {showTimePicker && (
          <div className="mt-2 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">Hora:</span>
              <div className="flex items-center space-x-1">
                {/* Selector de horas */}
                <select
                  value={selectedTime.hours}
                  onChange={(e) => handleTimeChange('hours', e.target.value)}
                  className="text-xs p-1 border rounded focus:ring-green-500 focus:border-green-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
                    <option key={hour} value={String(hour).padStart(2, '0')}>
                      {String(hour).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                
                <span className="text-xs">:</span>
                
                {/* Selector de minutos */}
                <select
                  value={selectedTime.minutes}
                  onChange={(e) => handleTimeChange('minutes', e.target.value)}
                  className="text-xs p-1 border rounded focus:ring-green-500 focus:border-green-500"
                >
                  {Array.from({ length: 60 }, (_, i) => i).map(minute => (
                    <option key={minute} value={String(minute).padStart(2, '0')}>
                      {String(minute).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                
                {/* Selector AM/PM */}
                <select
                  value={selectedTime.period}
                  onChange={(e) => handleTimeChange('period', e.target.value)}
                  className="text-xs p-1 border rounded focus:ring-green-500 focus:border-green-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* Indicador de fecha seleccionada */}
        <div className="mt-2 text-center">
          <div className="flex items-center justify-center mb-1">
            <span className="text-xs mr-2">Elegir hora</span>
            <button 
              type="button"
              onClick={() => setShowTimePicker(!showTimePicker)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full ${showTimePicker ? 'bg-gray-300' : 'bg-green-600'}`}
            >
              <span 
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${showTimePicker ? 'translate-x-1' : 'translate-x-5'}`} 
              />
            </button>
            <span className="text-xs ml-2">Usar hora actual</span>
          </div>
          <span className="text-xs font-medium text-gray-700">
            Fecha seleccionada: {selectedDate.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} {showTimePicker ? `- ${selectedTime.hours}:${selectedTime.minutes} ${selectedTime.period}` : '- Hora actual'}
          </span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-2">
        <input type="hidden" name="user_id" value={user_id} />
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
            {/* Temperatura Input */}
            <div className="flex flex-col items-center">
              <label htmlFor="temperatura" className="text-xs font-medium text-gray-700">
                🌡️ (°C)
              </label>
              <input
                type="number"
                id="temperatura"
                name="temperatura"
                value={formData.temperatura}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="Temp"
                step="0.1"
                required
              />
            </div>

            {/* Humedad Input */}
            <div className="flex flex-col items-center">
              <label htmlFor="humedad" className="text-xs font-medium text-gray-700">
                💧 (%)
              </label>
              <input
                type="number"
                id="humedad"
                name="humedad"
                value={formData.humedad}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="Hum"
                min="0"
                max="100"
                required
              />
            </div>

            {/* VPD and Dewpoint in more compact displays */}
            <div className="bg-blue-100 p-1 rounded-lg text-center">
              <div className="text-xs font-semibold">VPD 💨</div>
              <div className="text-xs font-bold">
                <span className="text-blue-700">{calculosEnVivo.vpd.toFixed(2)}</span> <span className="text-gray-900">kPa</span>
              </div>
            </div>

            <div className="bg-green-100 p-1 rounded-lg text-center">
              <div className="text-xs font-semibold">Dewp 🌡️</div>
              <div className="text-xs font-bold">
                <span className="text-blue-700">{calculosEnVivo.dewpoint.toFixed(2)}</span> <span className="text-gray-900">°C</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center justify-center gap-1 bg-custom-green hover:bg-green-600 text-white font-medium text-xs py-2 px-3 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Registrar
            </button>
            
            <button
              type="button"
              onClick={() => setShowBitacora(true)}
              className="flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs py-2 px-3 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Subir Foto
            </button>
            
            <button
              type="button"
              onClick={() => setShowAcciones(true)}
              className="flex items-center justify-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-xs py-2 px-3 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Acciones
            </button>
            
            
          </div>
        </div>
      </form>
      
      {showBitacora && (
        <AmbienteBitacoraLogs 
          cultivoId={cultivoId} 
          user_id={user_id} 
          onClose={() => setShowBitacora(false)} 
          selectedDate={getSelectedDateTime()}
        />
      )}
      
      {showAcciones && (
        <AccionesCalculator
          cultivoId={cultivoId}
          user_id={user_id}
          onClose={() => setShowAcciones(false)}
          selectedDate={getSelectedDateTime()}
        />
      )}
    </div>
  );
}
