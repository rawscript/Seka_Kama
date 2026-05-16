#!/bin/bash
# Start script for Railway/Cloudflare deployment
# Navigate to backend if started from root
if [ -d "backend" ]; then
  cd backend
fi

# Run the FastAPI server
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
