export default function InterestsSection({ register, errors, control }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Intereses y preferencias</h2>
      <div className="space-y-4">
        <div className="mb-4">
          <label 
            htmlFor="areas_interes" 
            className="block mb-1 font-medium text-gray-700"
          >
            Áreas de interés
          </label>
          <select
            id="areas_interes"
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            {...register('areas_interes')}
          >
            <option value="">Selecciona una opción</option>
            <option value="Cultivo orgánico">Cultivo orgánico</option>
            <option value="Cultivo medicinal">Cultivo medicinal</option>
            <option value="Genética">Genética y mejoramiento</option>
            <option value="Técnicas avanzadas">Técnicas avanzadas</option>
            <option value="Sostenibilidad">Sostenibilidad</option>
          </select>
        </div>

        <div className="mb-4">
          <label 
            htmlFor="objetivos_aprendizaje" 
            className="block mb-1 font-medium text-gray-700"
          >
            Objetivos de aprendizaje
          </label>
          <select
            id="objetivos_aprendizaje"
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            {...register('objetivos_aprendizaje')}
          >
            <option value="">Selecciona una opción</option>
            <option value="Mejorar técnicas">Mejorar técnicas actuales</option>
            <option value="Aprender nuevos métodos">Aprender nuevos métodos</option>
            <option value="Resolver problemas específicos">Resolver problemas específicos</option>
            <option value="Networking">Conectar con otros cultivadores</option>
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="contenido_preferido" className="block mb-1 font-medium text-gray-700">
            Tipo de contenido preferido
          </label>
          <select
            id="contenido_preferido"
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            {...register('contenido_preferido')}
          >
            <option value="">Selecciona una opción</option>
            <option value="Tutoriales">Tutoriales paso a paso</option>
            <option value="Experiencias">Experiencias de otros cultivadores</option>
            <option value="Información técnica">Información técnica detallada</option>
            <option value="Noticias">Noticias y tendencias</option>
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="intereses_adicionales" className="block mb-1 font-medium text-gray-700">
            Intereses adicionales
          </label>
          <textarea
            id="intereses_adicionales"
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white h-24 resize-none"
            placeholder="Comparte otros intereses relacionados con el cultivo..."
            {...register('intereses_adicionales')}
          />
        </div>
      </div>
    </section>
  );
} 