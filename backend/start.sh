#!/bin/bash
# Start script for Railway/Cloudflare deployment
# Navigate to backend if started from root
if [ -d "backend" ]; then
  cd backend
fi

# Run the FastAPI server
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
