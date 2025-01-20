# Usa la imagen base oficial de Python 3.11
FROM python:3.11-slim

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos necesarios al contenedor
COPY backend /app/backend

# Cambia al directorio correcto dentro del contenedor
WORKDIR /app/backend

# Instala las dependencias del proyecto
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Expone el puerto que será usado por la aplicación
EXPOSE 8000

# Comando para iniciar la aplicación
CMD ["hypercorn", "app.main:app", "--bind", "[::]:8000"]
