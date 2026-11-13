"""
Quick test script for Gradio app functionality
Run this before deploying to Hugging Face Spaces
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

def test_imports():
    """Test that all required imports work"""
    print("Testing imports...")
    try:
        import gradio as gr
        print("✅ Gradio imported")
        
        import plotly
        print("✅ Plotly imported")
        
        import pandas
        print("✅ Pandas imported")
        
        from main import app as fastapi_app
        print("✅ FastAPI app imported")
        
        from core.config import settings
        print("✅ Settings imported")
        
        return True
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False


def test_api_health():
    """Test that FastAPI app initializes"""
    print("\nTesting FastAPI initialization...")
    try:
        from main import app
        print(f"✅ FastAPI app initialized: {app.title}")
        return True
    except Exception as e:
        print(f"❌ FastAPI initialization failed: {e}")
        return False


def test_gradio_app_creation():
    """Test that Gradio app can be created"""
    print("\nTesting Gradio app creation...")
    try:
        from gradio_app import create_gradio_app
        demo = create_gradio_app()
        print("✅ Gradio app created successfully")
        return True
    except Exception as e:
        print(f"❌ Gradio app creation failed: {e}")
        return False


def test_model_files():
    """Check that model files exist"""
    print("\nChecking model files...")
    from core.config import settings
    
    files_to_check = [
        ("Model", settings.MODEL_PATH),
        ("Scaler", settings.SCALER_PATH),
        ("Feature Names", settings.FEATURE_NAMES_PATH),
    ]
    
    all_exist = True
    for name, path in files_to_check:
        if Path(path).exists():
            size_mb = Path(path).stat().st_size / (1024 * 1024)
            print(f"✅ {name}: {path} ({size_mb:.1f} MB)")
        else:
            print(f"❌ {name}: {path} NOT FOUND")
            all_exist = False
    
    return all_exist


def test_env_variables():
    """Check critical environment variables"""
    print("\nChecking environment variables...")
    import os
    
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_KEY",
        "SECRET_KEY",
        "NVIDIA_API_KEY",
    ]
    
    all_set = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            masked = value[:8] + "..." if len(value) > 8 else "***"
            print(f"✅ {var}: {masked}")
        else:
            print(f"❌ {var}: NOT SET")
            all_set = False
    
    return all_set


def main():
    """Run all tests"""
    print("=" * 60)
    print("Seka Kama Gradio App - Pre-Deployment Tests")
    print("=" * 60)
    
    results = {
        "Imports": test_imports(),
        "FastAPI": test_api_health(),
        "Gradio App": test_gradio_app_creation(),
        "Model Files": test_model_files(),
        "Environment Variables": test_env_variables(),
    }
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED - Ready for deployment!")
        print("\nNext steps:")
        print("1. Run: python gradio_app.py")
        print("2. Test at: http://localhost:7860")
        print("3. Deploy to Hugging Face Spaces")
    else:
        print("⚠️  SOME TESTS FAILED - Fix issues before deployment")
        print("\nCheck:")
        print("1. requirements-gradio.txt installed")
        print("2. .env file configured")
        print("3. Model files in models/ directory")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
