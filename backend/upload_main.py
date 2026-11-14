"""Upload fixed main.py to HF Space."""
from huggingface_hub import HfApi

api = HfApi()

print("Uploading fixed main.py to Jasekm2/Sekakama...")
api.upload_file(
    path_or_fileobj="main.py",
    path_in_repo="main.py",
    repo_id="Jasekm2/Sekakama",
    repo_type="space",
)

print("[OK] main.py uploaded successfully!")
print("Space will rebuild automatically.")
print("Visit: https://huggingface.co/spaces/Jasekm2/Sekakama")
