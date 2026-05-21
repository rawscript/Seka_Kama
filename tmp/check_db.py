import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("e:/Main/Projects/opensource/seka/Seka_Kama/backend/.env")
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

res = supabase.table("grid_cells").select("*").limit(1).execute()
if res.data:
    print(f"Columns: {list(res.data[0].keys())}")
    print(f"Centroid type: {type(res.data[0].get('centroid'))}")
    print(f"Centroid value: {res.data[0].get('centroid')}")
else:
    print("No data in grid_cells")
