export default function ObjectiveSection({ register, errors, control }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Objetivo del cultivo</h2>
      <div className="space-y-4">
        <div className="mb-4">
          <label 
            htmlFor="escala_cultivo" 
            className="block mb-1 font-medium text-gray-700"
          >
            Escala de cultivo
          </label>
          <select
            id="escala_cultivo"
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            {...register('escala_cultivo')}
          >
            <option value="">Selecciona una opción</option>
            <option value="Doméstico">Doméstico</option>
            <option value="Producción comercial">Producción comercial</option>
            <option value="Producción medicinal">Producción medicinal</option>
            <option value="Jardín urbano">Jardín urbano</option>
          </select>
        </div>

        <div className="mb-4">
          <label 
            htmlFor="motivacion" 
            className="block mb-1 font-medium text-gray-700"
          >
            Motivación o meta
          </label>
          <select
            id="motivacion"
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
            {...register('motivacion')}
          >
            <option value="">Selecciona una opcion</option>
            <option value="Autoconsumo">Autoconsumo</option>
            <option value="Venta">Venta</option>
            <option value="Investigación">Investigación</option>
            <option value="Hobbies">Hobbies</option>
            <option value="Conservación">Conservación</option>
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="desc_obj" className="block mb-1 font-medium text-gray-700">
            Descripción del objetivo
          </label>
          <textarea
            id="desc_obj"
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white h-24 resize-none"
            placeholder="Escribe aquí una breve descripción sobre tu cultivo..."
            {...register('desc_obj')}
          />
        </div>
      </div>
    </section>
  );
} 