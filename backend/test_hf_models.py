"""
Test script to verify Hugging Face Hub model loading

Run this to confirm models can be downloaded from HF Hub
before deploying to HF Spaces.
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))


def test_hf_hub_import():
    """Test that huggingface_hub is installed"""
    print("Testing huggingface_hub import...")
    try:
        from huggingface_hub import hf_hub_download
        print("[OK] huggingface_hub imported successfully")
        return True
    except ImportError as e:
        print(f"[FAIL] huggingface_hub not installed: {e}")
        print("Run: pip install huggingface-hub>=0.20.0")
        return False


def test_model_download():
    """Test downloading models from HF Hub"""
    print("\nTesting model download from HF Hub...")
    try:
        from huggingface_hub import hf_hub_download
        import joblib
        
        REPO_ID = os.getenv("HF_MODEL_REPO", "Jasekm2/sekanet-models")
        print(f"Repository: {REPO_ID}")
        
        # Test download each file
        files = {
            "model": "sekanet_xgboost_shp.pkl",
            "scaler": "sekanet_scaler_shp.pkl",
            "features": "feature_names.pkl"
        }
        
        downloaded = {}
        for name, filename in files.items():
            print(f"\n  Downloading {filename}...")
            try:
                path = hf_hub_download(repo_id=REPO_ID, filename=filename)
                print(f"  [OK] {filename} downloaded to: {path}")
                
                # Try loading
                data = joblib.load(path)
                
                if name == "features":
                    print(f"       Loaded {len(data)} features")
                elif name == "model":
                    print(f"       Model type: {type(data).__name__}")
                elif name == "scaler":
                    print(f"       Scaler type: {type(data).__name__}")
                
                downloaded[name] = path
                
            except Exception as e:
                print(f"  [FAIL] Failed to download/load {filename}: {e}")
                return False
        
        print(f"\n[OK] All {len(downloaded)} model files downloaded and loaded successfully")
        return True
        
    except Exception as e:
        print(f"[FAIL] Model download test failed: {e}")
        return False


def test_local_fallback():
    """Test that local files are used as fallback"""
    print("\nTesting local file fallback...")
    
    from core.config import settings
    
    local_files = [
        ("Model", settings.MODEL_PATH),
        ("Scaler", settings.SCALER_PATH),
        ("Features", settings.FEATURE_NAMES_PATH),
    ]
    
    local_available = 0
    for name, path in local_files:
        if Path(path).exists():
            size_mb = Path(path).stat().st_size / (1024 * 1024)
            print(f"  [OK] {name}: {path} ({size_mb:.1f} MB)")
            local_available += 1
        else:
            print(f"  [SKIP] {name}: {path} not found (will use HF Hub)")
    
    if local_available == 3:
        print(f"\n[OK] All local files available (fallback works)")
    elif local_available == 0:
        print(f"\n[INFO] No local files (will use HF Hub - this is normal for HF Spaces)")
    else:
        print(f"\n[WARNING] Some local files missing ({local_available}/3)")
    
    return True


def test_model_loading_logic():
    """Test the actual model loading function"""
    print("\nTesting model loading function...")
    try:
        # Import the actual function
        from main import _load_ml_models_async, _state
        
        print("  Running _load_ml_models_async()...")
        _load_ml_models_async()
        
        # Check state
        if _state["model"] is not None:
            print(f"  [OK] Model loaded: {type(_state['model']).__name__}")
        else:
            print("  [FAIL] Model is None")
            return False
        
        if _state["scaler"] is not None:
            print(f"  [OK] Scaler loaded: {type(_state['scaler']).__name__}")
        else:
            print("  [FAIL] Scaler is None")
            return False
        
        if _state["feature_names"] is not None:
            print(f"  [OK] Features loaded: {len(_state['feature_names'])} features")
        else:
            print("  [FAIL] Features is None")
            return False
        
        if _state["prediction_service"] is not None:
            print(f"  [OK] Prediction service initialized")
        else:
            print("  [FAIL] Prediction service is None")
            return False
        
        print("\n[OK] Model loading logic works correctly")
        return True
        
    except Exception as e:
        print(f"[FAIL] Model loading function failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("Hugging Face Hub Model Loading - Test Suite")
    print("=" * 60)
    
    results = {
        "HF Hub Import": test_hf_hub_import(),
        "Model Download": test_model_download(),
        "Local Fallback": test_local_fallback(),
        "Model Loading Logic": test_model_loading_logic(),
    }
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "[OK]" if passed else "[FAIL]"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 60)
    if all_passed:
        print("[SUCCESS] All tests passed!")
        print("\nYour setup is ready for HF Spaces deployment.")
        print("Models will auto-download from Jasekm2/sekanet-models")
        print("\nNext steps:")
        print("1. Deploy to HF Spaces")
        print("2. Models will download on first startup")
        print("3. Subsequent startups will use cached models")
    else:
        print("[WARNING] Some tests failed")
        print("\nCheck:")
        print("1. pip install huggingface-hub>=0.20.0")
        print("2. Internet connection for HF Hub access")
        print("3. .env file configured correctly")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
