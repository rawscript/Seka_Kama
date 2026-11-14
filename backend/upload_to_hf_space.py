"""
Sync all necessary files to Hugging Face Space (Jasekm2/Sekakama).
This ensures the Space has the latest code matching the local repository.
"""
from huggingface_hub import HfApi
from pathlib import Path
import os

api = HfApi()
REPO_ID = "Jasekm2/Sekakama"
BACKEND_DIR = Path(__file__).parent

# Files and directories to upload (relative to backend/)
FILES_TO_UPLOAD = [
    "gradio_app.py",
    "main.py",
    "requirements.txt",
    "requirements-gradio.txt",
]

DIRECTORIES_TO_UPLOAD = [
    "api",
    "core", 
    "services",
    "config",
]

def upload_file(local_path: Path, repo_path: str):
    """Upload a single file to the Space."""
    try:
        print(f"Uploading {repo_path}...")
        api.upload_file(
            path_or_fileobj=str(local_path),
            path_in_repo=repo_path,
            repo_id=REPO_ID,
            repo_type="space",
        )
        print(f"  [OK] {repo_path}")
    except Exception as e:
        print(f"  [ERROR] {repo_path}: {e}")

def upload_directory(local_dir: Path, repo_prefix: str):
    """Recursively upload a directory to the Space."""
    for item in local_dir.iterdir():
        if item.is_file() and item.suffix == ".py":
            repo_path = f"{repo_prefix}/{item.name}"
            upload_file(item, repo_path)
        elif item.is_dir() and item.name not in ["__pycache__", ".pytest_cache", "tests"]:
            upload_directory(item, f"{repo_prefix}/{item.name}")

def main():
    print(f"Syncing to HF Space: {REPO_ID}")
    print("=" * 60)
    
    # Upload individual files
    for filename in FILES_TO_UPLOAD:
        local_path = BACKEND_DIR / filename
        if local_path.exists():
            upload_file(local_path, filename)
        else:
            print(f"[SKIP] {filename} not found")
    
    # Upload directories
    for dirname in DIRECTORIES_TO_UPLOAD:
        local_dir = BACKEND_DIR / dirname
        if local_dir.exists():
            upload_directory(local_dir, dirname)
        else:
            print(f"[SKIP] {dirname}/ not found")
    
    # Upload .env.template as .env for HF Spaces (without secrets)
    env_template = BACKEND_DIR / ".env.template"
    if env_template.exists():
        # Create a minimal .env for HF Spaces
        hf_env_content = """# Hugging Face Space Environment
# Secrets are set via HF Space settings, not here
DEBUG=false
API_BASE_URL=http://localhost:7860
"""
        print("Creating minimal .env for HF Spaces...")
        upload_file(BACKEND_DIR / ".env.template", ".env.template")
    
    print("\n" + "=" * 60)
    print("[OK] Upload complete!")
    print(f"Space URL: https://huggingface.co/spaces/{REPO_ID}")
    print("\nNote: The Space will automatically rebuild.")
    print("Check the logs at: https://huggingface.co/spaces/{REPO_ID}/logs")

if __name__ == "__main__":
    main()
