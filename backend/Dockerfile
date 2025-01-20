# Usa una imagen base ligera de Python
FROM python:3.10-slim

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar el código del backend
COPY . .

# Instalar las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Exponer el puerto para el servicio (usualmente el 8000 para FastAPI)
EXPOSE 8000

# Comando para iniciar el servidor
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
