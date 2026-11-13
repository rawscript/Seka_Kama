"""
Quick script to upload the correct README.md to Hugging Face Space
"""

from huggingface_hub import HfApi

api = HfApi()

# Upload README_SPACE.md as README.md to the Space
api.upload_file(
    path_or_fileobj="backend/README_SPACE.md",
    path_in_repo="README.md",
    repo_id="Jasekm2/Sekakama",
    repo_type="space",
    commit_message="Fix: Add proper README.md with YAML metadata for HF Spaces"
)

print("✓ README.md uploaded successfully!")
print("URL: https://huggingface.co/spaces/Jasekm2/Sekakama")
