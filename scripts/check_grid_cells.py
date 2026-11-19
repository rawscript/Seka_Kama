from dotenv import load_dotenv
load_dotenv()
import os
from supabase import create_client

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

client = create_client(url, key)
result = client.table('grid_cells').select('cell_id,geom').limit(3).execute()

print(f"Total grid cells: {len(result.data)}")
for r in result.data:
    geom = r['geom']
    if isinstance(geom, dict):
        coords = geom.get('coordinates', [[]])
        if coords and len(coords[0]) > 0:
            print(f"Cell {r['cell_id']}: first coord = {coords[0][0]}")
result = client.table('grid_cells').select('cell_id,geom').limit(3).execute()

for r in result.data:
    geom = r['geom']
    if isinstance(geom, dict):
        coords = geom.get('coordinates', [[]])
        if coords and len(coords[0]) > 0:
            print(f'Cell {r["cell_id"]}: first coord = {coords[0][0]}')
