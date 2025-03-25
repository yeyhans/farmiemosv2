import { Controller } from 'react-hook-form';

export default function PersonalSection({ register, errors, control }) {
  return (
    <section className="space-y-1">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 border-b pb-2">Datos personales</h2>
      <div className="space-y-4 sm:space-y-6">
        {/* Campo Nombre de usuario */}
        <div>
          <label htmlFor="user_name" className="block mb-1 text-sm font-medium text-gray-700">
            Nombre de usuario
          </label>
          <input
            id="user_name"
            type="text"
            className={`w-full border ${errors.user_name ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-green-500`}
            {...register('user_name', { required: 'El nombre de usuario es obligatorio' })}
          />
          {errors.user_name && (
            <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.user_name.message}</p>
          )}
        </div>

        {/* Campo Instagram */}
        <div>
          <label htmlFor="instagram" className="block mb-1 text-sm font-medium text-gray-700">
            Instagram
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-100 text-gray-500 text-xs sm:text-sm rounded-l-md">
              @
            </span>
            <input
              id="instagram"
              type="text"
              className="w-full border border-gray-300 rounded-r-md px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="tu_usuario"
              {...register('instagram')}
            />
          </div>
        </div>

        {/* Resto de campos adaptados para móvil y tablet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Campo Nivel de experiencia */}
          <div>
            <label htmlFor="experience_level" className="block mb-1 text-sm font-medium text-gray-700">
              Nivel de experiencia
            </label>
            <select
              id="experience_level"
              className={`w-full border ${errors.experience_level ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 bg-white text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-green-500`}
              {...register('experience_level', { required: 'El nivel de experiencia es obligatorio' })}
            >
              <option value="">Selecciona una opción</option>
              <option value="Principiante">Principiante</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
            {errors.experience_level && (
              <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.experience_level.message}</p>
            )}
          </div>

          {/* Campo Comuna */}
          <div>
            <label htmlFor="comuna" className="block mb-1 text-sm font-medium text-gray-700">
              Comuna
            </label>
            <input
              id="comuna"
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-green-500"
              {...register('comuna')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Campo Cultivo Principal */}
          <div>
            <label htmlFor="cultivo_principal" className="block mb-1 text-sm font-medium text-gray-700">
              Tipo de cultivo principal
            </label>
            <select
              id="cultivo_principal"
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-green-500"
              {...register('cultivo_principal')}
            >
              <option value="">Selecciona una opción</option>
              <option value="Cannabis">Cannabis</option>
              <option value="Hortalizas">Hortalizas</option>
              <option value="Frutales">Frutales</option>
              <option value="Flores">Flores</option>
              <option value="Plantas ornamentales">Plantas ornamentales</option>
            </select>
          </div>

          {/* Principales problemas enfrentados */}
          <div>
            <label htmlFor="problemas_enfrentados" className="block mb-1 text-sm font-medium text-gray-700">
              Principales problemas enfrentados
            </label>
            <select
              id="problemas_enfrentados"
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm sm:text-base focus:ring-2 focus:ring-green-500 focus:border-green-500"
              {...register('problemas_enfrentados')}
            >
              <option value="">Selecciona una opción</option>
              <option value="Falta de tiempo">Falta de tiempo</option>
              <option value="Plagas específicas">Plagas específicas</option>
              <option value="Malezas">Malezas</option>
              <option value="Variaciones climáticas">Variaciones climáticas</option>
              <option value="Falta de conocimiento">Falta de conocimiento</option>
              <option value="Espacio limitado">Espacio limitado</option>
              <option value="Calidad del suelo">Calidad del suelo</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
} 