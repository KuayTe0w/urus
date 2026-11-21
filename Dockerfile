FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY backend /app/backend
COPY frontend /app/frontend
CMD exec gunicorn --bind "0.0.0.0:${PORT:-8080}" --workers 2 --threads 4 --worker-class gthread 'backend.app:create_app()'
