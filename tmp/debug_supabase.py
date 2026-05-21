import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Search for .env relative to this script
env_path = os.path.join("/backend/.env")
load_dotenv(env_path)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"URL: {url[:30]}...")
print(f"Key Found: {'Yes' if key else 'No'}")

if not url or not key:
    sys.exit("Missing env vars")

supabase = create_client(url, key)

try:
    # Check total count
    res = supabase.table("grid_cells").select("cell_id", count="exact").limit(1).execute()
    print(f"Total count according to Supabase: {res.count}")
    print(f"Data sample: {res.data}")
    
    # Check if we can see any columns
    res_all = supabase.table("grid_cells").select("*").limit(1).execute()
    if res_all.data:
        print(f"Columns in DB: {list(res_all.data[0].keys())}")
    else:
        print("Table appears empty.")
except Exception as e:
    print(f"Error connecting: {e}")
