# backend/Dockerfile
# Persistent FastAPI container for Back4App (and other container hosts).
# The API does not import GeoPandas/GDAL at runtime, so avoid the large GIS and
# compiler toolchain that made the prior image exceed Back4App's build window.
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Keep dependency installation cacheable between source-only deployments.
COPY requirements.txt ./
RUN pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

COPY . ./

RUN useradd --create-home --uid 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Back4App supplies PORT at runtime; 8000 remains the local fallback.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
