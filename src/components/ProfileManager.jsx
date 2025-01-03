import React, { useState } from "react";

const ProfileManager = () => {
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState({
    user_id: "",
    instagram: "",
    comuna: "",
  });
  const [loading, setLoading] = useState(false);

  // Maneja cambios en el formulario
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Crear o actualizar perfil
  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/profiles/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al guardar");
      alert("Perfil guardado exitosamente");
      fetchProfiles(); // Actualiza la lista de perfiles
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Leer perfiles
  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/profiles/get?user_id=${form.user_id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al obtener perfiles");
      setProfiles(data ? [data] : []);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar perfil
  const handleDelete = async (user_id) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este perfil?")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/profiles/delete?user_id=${user_id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al eliminar");
      alert("Perfil eliminado");
      fetchProfiles();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-center">Gestión de Perfiles</h2>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div>
          <label htmlFor="user_id" className="block text-sm font-medium">
            ID de Usuario
          </label>
          <input
            id="user_id"
            name="user_id"
            type="text"
            value={form.user_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="instagram" className="block text-sm font-medium">
            Instagram
          </label>
          <input
            id="instagram"
            name="instagram"
            type="text"
            value={form.instagram}
            onChange={handleChange}
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="comuna" className="block text-sm font-medium">
            Comuna
          </label>
          <input
            id="comuna"
            name="comuna"
            type="text"
            value={form.comuna}
            onChange={handleChange}
            required
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={loading}
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </form>

      <button
        onClick={fetchProfiles}
        className="w-full py-2 px-4 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        Cargar Perfil
      </button>

      <ul className="space-y-2">
        {profiles.map((profile) => (
          <li
            key={profile.user_id}
            className="p-4 border rounded-md flex justify-between items-center"
          >
            <div>
              <p>
                <strong>ID:</strong> {profile.user_id}
              </p>
              <p>
                <strong>Instagram:</strong> {profile.instagram}
              </p>
              <p>
                <strong>Comuna:</strong> {profile.comuna}
              </p>
            </div>
            <button
              onClick={() => handleDelete(profile.user_id)}
              className="py-1 px-3 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProfileManager;
