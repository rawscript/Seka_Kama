"""
Minimal Vercel test endpoint - no external dependencies
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "message": "Basic test works"}

@app.get("/test")
async def test():
    return {"message": "Vercel Python is working"}

@app.get("/api/cors-check")
async def cors_check(request: Request):
    origin = request.headers.get("origin", "")
    return {
        "origin": origin,
        "allowed": True,
        "message": "CORS test"
    }