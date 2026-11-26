FROM python:3.13-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt
COPY backend ./backend
WORKDIR /app/backend
RUN DJANGO_SECRET_KEY=build-only-placeholder-key-not-used-at-runtime-0123456789abcdefghij DATABASE_URL=postgresql://build:build@localhost/build python manage.py collectstatic --noinput
CMD sh -c "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8080} --workers 2 --timeout 120"
