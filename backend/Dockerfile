FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.hf.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY gradio_app.py .
COPY main.py .
COPY api/ ./api/
COPY core/ ./core/
COPY services/ ./services/
COPY models/ ./models/

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV SPACE_ID=Jasekm2/Sekakama

# Expose port
EXPOSE 7860

# Run the app
CMD ["python", "gradio_app.py"]
