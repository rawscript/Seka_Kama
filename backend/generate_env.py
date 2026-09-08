import os
import re
from pathlib import Path

# Save your template text in a file named .env.example
TEMPLATE_FILE = ".env.production.example"
OUTPUT_FILE = ".env"

def resolve_env_vars(template_path: str = TEMPLATE_FILE, output_path: str = OUTPUT_FILE):
    source = Path(template_path)

    if not source.exists():
        print(f"❌ Error: Template file '{template_path}' not found.")
        print(f"Please create '{template_path}' and paste your environment template into it.")
        return

    content = source.read_text(encoding="utf-8")
    
    # Regex matching ${VAR_NAME} pattern
    pattern = re.compile(r"\$\{([A-Za-z0-9_]+)\}")
    
    missing_vars = []
    found_vars = []

    def replace_var(match):
        var_name = match.group(1)
        val = os.environ.get(var_name)
        
        if val is not None:
            found_vars.append(var_name)
            return val
        else:
            missing_vars.append(var_name)
            return match.group(0)  # Keep ${VAR_NAME} if not found in environment

    rendered_content = pattern.sub(replace_var, content)
    
    # Write output file
    Path(output_path).write_text(rendered_content, encoding="utf-8")
    
    print("\n" + "=" * 50)
    print(f"✅ Generated output saved to: {output_path}")
    print("=" * 50)
    
    if found_vars:
        print(f"\n✔️  Successfully replaced ({len(found_vars)}):")
        for v in set(found_vars):
            print(f"   - {v}")

    if missing_vars:
        print(f"\n⚠️  Missing from Windows Environment ({len(set(missing_vars))}):")
        for v in set(missing_vars):
            print(f"   - {v}")
        print("\n👉 These variables returned empty because they are not set in your Windows session.")

if __name__ == "__main__":
    resolve_env_vars()