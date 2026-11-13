# 🚀 Gradio Quickstart Guide

## What Was Created

Your FastAPI backend now has a **Gradio wrapper** that provides a public demo interface, ready for Hugging Face Spaces deployment.

### New Files

1. **`backend/gradio_app.py`** - Main Gradio application
   - Wraps FastAPI endpoints with Gradio UI
   - 4 tabs: Baseline, Model Insights, Scenarios, Health
   - Interactive charts with Plotly
   
2. **`backend/test_gradio.py`** - Pre-deployment test suite
   - Checks imports, models, environment variables
   
3. **`backend/requirements-gradio.txt`** - Additional dependencies
   - Gradio 4.0+, Plotly 5.0+, Pandas 2.0+
   
4. **`backend/README_HUGGINGFACE.md`** - HF Space documentation
   - Space metadata (title, emoji, SDK version)
   
5. **`docs/HUGGINGFACE_DEPLOYMENT.md`** - Complete deployment guide

---

## Quick Test Locally (5 minutes)

### Step 1: Install Gradio Dependencies

```bash
cd backend
pip install -r requirements-gradio.txt
```

### Step 2: Run Tests

```bash
python test_gradio.py
```

Expected output:
```
✅ Imports
✅ FastAPI  
✅ Gradio App
✅ Model Files
✅ Environment Variables
🎉 ALL TESTS PASSED
```

### Step 3: Launch Gradio App

```bash
python gradio_app.py
```

Visit: **http://localhost:7860**

### Step 4: Test Each Tab

1. **📍 Baseline Predictions**
   - Click "Load Baseline Summary"
   - Should show total lions + bar chart

2. **📊 Model Insights**
   - Click "Load Feature Importance"
   - Should show top 15 features with horizontal bar chart

3. **🔮 Scenario Simulation**
   - Enter: "Build a luxury hotel"
   - Nightlight: +30%
   - Click "Run Simulation"
   - Should show prediction + warning if increase

4. **⚙️ System Status**
   - Click "Check Health"
   - Should show "✅ healthy" status

---

## Deploy to Hugging Face Spaces (15 minutes)

### Step 1: Create Space

1. Go to https://huggingface.co/new-space
2. Name: `seka-kama`
3. SDK: **Gradio**
4. Hardware: **CPU Basic** (free)
5. Click "Create Space"

### Step 2: Configure Space

Copy these files to the Space root:

```bash
# From backend/ to Space root
gradio_app.py          → gradio_app.py
README_HUGGINGFACE.md  → README.md
requirements-gradio.txt → requirements.txt
.spaceignore           → .spaceignore

# Copy entire backend structure
main.py                → main.py
api/                   → api/
core/                  → core/
services/              → services/
models/                → models/
config/                → config/
```

### Step 3: Add Secrets

In Space settings → Variables and secrets:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SECRET_KEY=your-jwt-secret
NVIDIA_API_KEY=nvapi-xxx...
```

### Step 4: Push and Deploy

```bash
# Clone your HF Space
git clone https://huggingface.co/spaces/YOUR-USERNAME/seka-kama
cd seka-kama

# Copy files (as listed in Step 2)
cp -r ../backend/* .

# Commit and push
git add .
git commit -m "Initial deployment"
git push
```

Space will auto-build and deploy in ~5-10 minutes.

---

## What the Gradio Interface Provides

### 🎯 For End Users

1. **No-Code Interface**: Test scenarios without programming
2. **Visual Results**: Interactive Plotly charts
3. **Instant Feedback**: See predictions in real-time
4. **Educational**: Understand model behavior

### 🌐 For Demos

1. **Public URL**: Share with stakeholders
2. **No Setup**: Runs in browser
3. **Always Available**: Hosted on HF infrastructure
4. **Free Tier**: CPU Basic sufficient for demo

### 🔗 Integration

- FastAPI backend runs on `http://localhost:8000`
- Gradio UI runs on `http://localhost:7860`
- Both mounted in same process
- API docs available at `/redoc`

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Gradio Interface                │
│    http://localhost:7860/               │
│                                         │
│  ┌──────────┐  ┌──────────┐           │
│  │ Baseline │  │ Scenarios│           │
│  └──────────┘  └──────────┘           │
│  ┌──────────┐  ┌──────────┐           │
│  │  Model   │  │  Health  │           │
│  └──────────┘  └──────────┘           │
└─────────────┬───────────────────────────┘
              │ API calls
              ↓
┌─────────────────────────────────────────┐
│         FastAPI Backend                 │
│    http://localhost:8000/               │
│                                         │
│  /baseline/summary                      │
│  /feature-importance                    │
│  /scenario (POST)                       │
│  /health                                │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│   Supabase Database + ML Models         │
└─────────────────────────────────────────┘
```

---

## Customization

### Add New Tab

Edit `backend/gradio_app.py`:

```python
with gr.Tab("🆕 New Feature"):
    gr.Markdown("### Description")
    
    btn = gr.Button("Run")
    output = gr.Markdown()
    
    btn.click(fn=your_function, outputs=output)
```

### Change Theme

```python
demo = gr.Blocks(
    theme=gr.themes.Soft(
        primary_hue="blue",      # Change color
        secondary_hue="teal",
    )
)
```

### Add Authentication

```python
demo.launch(auth=("username", "password"))
```

---

## Troubleshooting

### Import Error: No module 'gradio'

```bash
pip install gradio plotly pandas
```

### Port Already in Use

```bash
# Kill process on port 7860
netstat -ano | findstr :7860
taskkill /PID <PID> /F

# Or use different port
python gradio_app.py --server-port 7861
```

### API Calls Failing

Check FastAPI is running:
```bash
curl http://localhost:8000/health
```

If not, start backend separately:
```bash
python -m uvicorn main:app --reload
```

### HF Space Build Fails

1. Check `requirements.txt` includes all dependencies
2. Verify Python version (3.10+ recommended)
3. Check logs in HF Space settings
4. Ensure model files < 100MB total

---

## Performance

### Local

- Startup: ~5 seconds (model loading)
- Baseline query: ~1-2 seconds
- Scenario simulation: ~25-35 seconds (with cache)

### HF Spaces (CPU Basic)

- Cold start: ~30-60 seconds (first load after sleep)
- Warm: Same as local
- Concurrent users: ~5-10 (free tier)

### Optimization Tips

1. **Cache aggressive**: NASA API calls cached
2. **Async all the things**: Already implemented
3. **Upgrade hardware**: $9/month for CPU Upgrade
4. **Use CDN**: For static assets

---

## Next Steps

✅ **Completed**:
- Gradio wrapper created
- FastAPI integration
- Demo interface
- Deployment docs

🔄 **Now**:
1. Test locally: `python backend/gradio_app.py`
2. Deploy to HF Spaces
3. Share demo URL with stakeholders

📚 **Future**:
- Add authentication for private access
- Custom domain (HF Pro feature)
- Analytics tracking
- A/B testing different model versions

---

## Resources

- **Gradio Docs**: https://gradio.app/docs/
- **HF Spaces Guide**: https://huggingface.co/docs/hub/spaces
- **Full Deployment Guide**: `docs/HUGGINGFACE_DEPLOYMENT.md`

---

## Questions?

- Test issues? Run `python backend/test_gradio.py`
- Deployment issues? Check `docs/HUGGINGFACE_DEPLOYMENT.md`
- API issues? Check `/health` endpoint

**Ready to demo!** 🦁✨
