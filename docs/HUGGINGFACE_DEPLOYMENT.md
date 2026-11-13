# Deploying Seka Kama to Hugging Face Spaces

## Overview

The Gradio wrapper (`backend/gradio_app.py`) allows the Seka Kama backend to run on Hugging Face Spaces,
providing a public demo interface for the ecological digital twin.

---

## Prerequisites

1. **Hugging Face Account**: Sign up at https://huggingface.co
2. **Git LFS**: For large model files (if needed)
   ```bash
   git lfs install
   ```
3. **Environment Variables**: Prepare your `.env` secrets

---

## Deployment Steps

### 1. Create New Space

1. Go to https://huggingface.co/spaces
2. Click "Create new Space"
3. Configure:
   - **Name**: `seka-kama` (or your preferred name)
   - **SDK**: Gradio
   - **Hardware**: CPU Basic (or GPU if budget allows)
   - **Visibility**: Public or Private

### 2. Prepare Repository

From the `backend/` directory:

```bash
cd backend

# Initialize git if not already
git init

# Add Hugging Face remote
git remote add hf https://huggingface.co/spaces/[YOUR-USERNAME]/seka-kama

# Copy README for Hugging Face
cp README_HUGGINGFACE.md README.md
```

### 3. Configure Secrets

In your Hugging Face Space settings, add these secrets:

**Required**:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SECRET_KEY=your-jwt-secret-key
NVIDIA_API_KEY=your-nvidia-nim-api-key
```

**Optional** (for enhanced features):
```
ALLOWED_ORIGINS=https://huggingface.co,https://seka-kama.vercel.app
```

### 4. Prepare Files

Create a requirements.txt that includes Gradio:

```bash
# Use the Gradio-specific requirements
cp requirements-gradio.txt requirements.txt
```

Ensure model files are available:

**Option A: Include in repo** (if <100MB total):
```bash
# Models are already in models/ directory
git add models/*.pkl
```

**Option B: Download on startup** (for larger models):
Create `download_models.py`:

```python
import requests
import joblib
from pathlib import Path

MODEL_URLS = {
    "model": "https://your-host.com/sekanet_xgboost_shp.pkl",
    "scaler": "https://your-host.com/sekanet_scaler_shp.pkl",
    "features": "https://your-host.com/feature_names.pkl"
}

def download_models():
    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)
    
    for name, url in MODEL_URLS.items():
        path = models_dir / f"{name}.pkl"
        if not path.exists():
            print(f"Downloading {name}...")
            response = requests.get(url)
            with open(path, 'wb') as f:
                f.write(response.content)

if __name__ == "__main__":
    download_models()
```

### 5. Deploy

```bash
# Add all files
git add .

# Commit
git commit -m "Initial Hugging Face Space deployment"

# Push to Hugging Face
git push hf main
```

### 6. Monitor Deployment

1. Go to your Space URL: `https://huggingface.co/spaces/[YOUR-USERNAME]/seka-kama`
2. Watch build logs
3. Wait for "Running" status
4. Test the interface

---

## File Structure for HF Spaces

Your Hugging Face repo should contain:

```
seka-kama/  (root of HF Space)
├── gradio_app.py          # Main app file (REQUIRED)
├── requirements.txt       # Dependencies (REQUIRED)
├── README.md             # Space description (from README_HUGGINGFACE.md)
├── .spaceignore          # Files to ignore
├── main.py               # FastAPI app
├── api/                  # API modules
│   ├── routes.py
│   ├── models.py
│   └── ...
├── core/                 # Core utilities
│   ├── config.py
│   ├── database.py
│   └── ...
├── services/             # Business logic
│   ├── prediction_service.py
│   ├── llm_service.py
│   └── ...
├── models/               # ML models
│   ├── sekanet_xgboost_shp.pkl
│   ├── sekanet_scaler_shp.pkl
│   └── feature_names.pkl
└── config/               # Configuration files
    └── scenario_features.yaml
```

---

## Environment Configuration

### For Hugging Face Spaces

In `backend/.env` or Space secrets:

```bash
# API Base URL (leave as localhost for internal calls)
API_BASE_URL=http://localhost:8000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# NVIDIA NIM
NVIDIA_API_KEY=your-api-key
NVIDIA_MODEL=meta/llama-3.1-8b-instruct

# Feature Flags
FEATURE_SCENARIO_SIMULATION_ENABLED=true

# Model Paths (relative to backend/)
MODEL_PATH=models/sekanet_xgboost_shp.pkl
SCALER_PATH=models/sekanet_scaler_shp.pkl
FEATURE_NAMES_PATH=models/feature_names.pkl

# CORS (allow HF Spaces domain)
ALLOWED_ORIGINS=https://huggingface.co,https://[your-username]-seka-kama.hf.space

# Rate Limiting
REDIS_ENABLED=false  # Disable Redis for HF Spaces (use in-memory)

# Logging
DEBUG=false
LOG_LEVEL=INFO
```

---

## Testing Locally Before Deployment

Run the Gradio app locally to test:

```bash
cd backend

# Set environment variables
export $(cat .env | xargs)

# Run Gradio app
python gradio_app.py
```

Visit: http://localhost:7860

Test all tabs:
1. Baseline Predictions
2. Model Insights
3. Scenario Simulation
4. System Status

---

## Troubleshooting

### Space Won't Build

**Check**:
1. `requirements.txt` includes all dependencies
2. `gradio_app.py` exists in root
3. Python version compatible (3.10+ recommended)

**Fix**:
```bash
# Ensure requirements are pinned
pip freeze > requirements.txt
```

### Import Errors

**Problem**: `ModuleNotFoundError: No module named 'api'`

**Fix**: Ensure proper Python path setup in `gradio_app.py`:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
```

### Model Loading Fails

**Problem**: `FileNotFoundError: models/sekanet_xgboost_shp.pkl`

**Fix**: 
1. Check model files are in repo
2. Check `MODEL_PATH` in `.env`
3. Use absolute paths relative to `gradio_app.py`

### Supabase Connection Timeout

**Problem**: Database queries timing out

**Fix**:
1. Increase `httpx.AsyncClient(timeout=120.0)`
2. Check Supabase project is active
3. Verify `SUPABASE_URL` and keys are correct

### CORS Errors

**Problem**: API calls blocked by CORS

**Fix**:
```bash
# Update ALLOWED_ORIGINS in Space secrets
ALLOWED_ORIGINS=https://huggingface.co,https://[your-space].hf.space
```

---

## Hardware Requirements

### CPU Basic (Free Tier)
- ✅ Works for demo purposes
- ⏱️ Slower scenario simulations (~45-60 seconds)
- 💾 2GB RAM (sufficient for model loading)

### CPU Upgrade ($9/month)
- ⚡ Faster predictions (~25-35 seconds)
- 💾 8GB RAM (handles concurrent requests)

### GPU (Not needed)
- ❌ XGBoost doesn't benefit from GPU acceleration
- 💰 Not cost-effective for this use case

**Recommendation**: Start with CPU Basic, upgrade if needed

---

## Monitoring & Maintenance

### Check Space Health

Visit: `https://[your-space].hf.space/health`

Expected response:
```json
{
  "status": "healthy",
  "components": {
    "api": "operational",
    "database": "operational",
    "ml_model": "operational",
    "llm_service": "operational"
  }
}
```

### View Logs

1. Go to Space settings
2. Click "Logs" tab
3. Monitor for errors

### Update Space

```bash
# Make changes locally
git add .
git commit -m "Update: [description]"

# Push to HF
git push hf main
```

Space will rebuild automatically.

---

## Limitations on HF Spaces

1. **No Persistent Storage**: Database must be external (Supabase)
2. **Timeout**: Long-running operations may timeout (use async carefully)
3. **Cold Start**: Space sleeps after inactivity, first load will be slow
4. **Rate Limits**: HF may rate-limit excessive API calls
5. **Public Access**: Anyone can use your Space (consider authentication)

---

## Production Deployment Alternatives

If Hugging Face Spaces limitations are problematic:

### Option 1: Railway.app
- Persistent storage
- Custom domains
- Better performance
- Starting at $5/month

### Option 2: Render.com
- Docker support
- Auto-scaling
- Free tier available

### Option 3: AWS/GCP/Azure
- Full control
- Production-grade
- Higher complexity

---

## Security Considerations

1. **Secrets**: Use HF Space secrets, NEVER commit `.env`
2. **API Keys**: Rotate regularly
3. **Rate Limiting**: Enable for public spaces
4. **Authentication**: Consider adding login for full features
5. **Input Validation**: Already handled in FastAPI routes

---

## Next Steps

1. ✅ Test Gradio app locally
2. ✅ Create Hugging Face Space
3. ✅ Configure secrets
4. ✅ Deploy and monitor
5. 📊 Share demo link
6. 🔄 Iterate based on feedback

---

## Support

- **HF Spaces Docs**: https://huggingface.co/docs/hub/spaces
- **Gradio Docs**: https://gradio.app/docs/
- **Issues**: Report on main GitHub repository

---

**Ready to deploy!** 🚀🦁
