"""Upload fixed gradio_app.py to HF Space."""
from huggingface_hub import HfApi

api = HfApi()

print("Uploading fixed gradio_app.py to Jasekm2/Sekakama...")
api.upload_file(
    path_or_fileobj="gradio_app.py",
    path_in_repo="gradio_app.py",
    repo_id="Jasekm2/Sekakama",
    repo_type="space",
)

print("[OK] gradio_app.py uploaded successfully!")
print("Space will rebuild automatically.")
print("Visit: https://huggingface.co/spaces/Jasekm2/Sekakama")
