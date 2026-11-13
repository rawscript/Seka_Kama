"""
Upload fixed requirements.txt to HF Space
"""

from huggingface_hub import HfApi

api = HfApi()

# Upload requirements-gradio.txt as requirements.txt to the Space
api.upload_file(
    path_or_fileobj="backend/requirements-gradio.txt",
    path_in_repo="requirements.txt",
    repo_id="Jasekm2/Sekakama",
    repo_type="space",
    commit_message="Fix: Pin huggingface-hub version to avoid HfFolder import error"
)

print("✓ requirements.txt uploaded successfully!")
print("Space will rebuild automatically with compatible versions")
print("URL: https://huggingface.co/spaces/Jasekm2/Sekakama")
