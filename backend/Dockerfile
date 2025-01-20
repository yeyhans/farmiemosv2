# Usar una imagen base de Python
FROM python:3.10-slim

# Establecer el directorio de trabajo en la imagen de Docker
WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar el archivo de requisitos
COPY requirements.txt /app/requirements.txt

# Crear un entorno virtual en el contenedor
RUN python -m venv /opt/venv

# Actualizar pip, setuptools y wheel
RUN /opt/venv/bin/python -m pip install --upgrade pip setuptools wheel

# Instalar las dependencias de Python
RUN /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# Copiar el código de la aplicación a la imagen de Docker
COPY . /app/

# Copiar archivo .env al contenedor
COPY .env /app/.env

# Establecer la variable de entorno para usar el entorno virtual
ENV PATH="/opt/venv/bin:$PATH"

# Exponer el puerto en el que uvicorn correrá el servidor (por defecto es 8000)
EXPOSE 8000

# Iniciar el servidor utilizando uvicorn, en modo de recarga
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
