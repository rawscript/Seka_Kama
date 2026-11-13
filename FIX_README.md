# Fix Hugging Face Space README

## The Problem
The HF Space is failing because the README.md doesn't have the correct YAML metadata.

## The Solution

### Step 1: Activate Virtual Environment
```powershell
cd D:\projects\seka_kama\Seka_Kama\backend
.\.venv\Scripts\Activate.ps1
```

### Step 2: Upload the Correct README

```powershell
# From the project root (D:\projects\seka_kama\Seka_Kama)
cd ..
hf upload Jasekm2/Sekakama ./backend/README_SPACE.md README.md --repo-type=space
```

### What the Correct README Has

The README_SPACE.md file now has the proper YAML metadata:

```yaml
---
title: Seka Kama Ecological Digital Twin
emoji: 🦁
colorFrom: yellow
colorTo: red              # FIXED: was "orange" which is not allowed
sdk: gradio
sdk_version: "4.44.0"
python_version: "3.10"
app_file: gradio_app.py   # This tells HF to run gradio_app.py
pinned: false
license: mit
---
```

### Valid Color Options
HF Spaces only accepts these colors:
- red
- yellow
- green
- blue
- indigo
- purple
- pink
- gray

### Why It Failed Before
1. First attempt: Missing YAML metadata entirely
2. Second attempt: `colorTo: orange` - not a valid color
3. Third attempt: `emoji: none` - must be actual emoji

### After Upload

1. Go to https://huggingface.co/spaces/Jasekm2/Sekakama
2. The Space should automatically rebuild
3. Check the logs for build progress
4. Models will download from Jasekm2/sekanet-models
5. Space should be live at the URL above

### Expected Build Logs

```
Building...
Installing dependencies from requirements.txt
Downloading models from HF Hub...
Loading sekanet_xgboost_shp.pkl...
Loading sekanet_scaler_shp.pkl...
Loading feature_names.pkl...
Starting Gradio app on port 7860...
Running!
```

### If Still Failing

Check the Space logs for:
- Missing dependencies
- Model download errors
- Import errors
- Missing environment variables (secrets)

The secrets you need configured:
- SUPABASE_URL
- SUPABASE_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SECRET_KEY
- NVIDIA_API_KEY
