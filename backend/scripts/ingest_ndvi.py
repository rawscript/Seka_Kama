import json
import os
import ijson  # High performance for large JSON files
from supabase import create_client
from dotenv import load_dotenv

# Search for .env in parent directories
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

# Config
JSON_PATH = "E:/Data/Mara_NDVI_2025.json" # Place your file here
BATCH_SIZE = 500

def ingest_ndvi():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print(" Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found.")
        print(f" Checked for .env at: {os.path.abspath(dotenv_path)}")
        return

    print(f" Connecting to Supabase at {url[:20]}...")
    supabase = create_client(url, key)

    print(f" Starting NDVI ingestion from {JSON_PATH}...")

    with open(JSON_PATH, 'rb') as f:
        # Deep forensic: print first 50 ijson events to see where data is hiding
        print(" DIAGNOSTIC: First 50 ijson events:")
        parser = ijson.parse(f)
        try:
            for i, (prefix, event, value) in enumerate(parser):
                print(f"  {i}: {prefix} | {event} | {value}")
                if i >= 50: break
        except Exception as e:
            print(f"  Diagnostic error: {e}")
        f.seek(0)

        # Assuming the JSON is a FeatureCollection
        features = ijson.items(f, 'features.item')
        
        batch = []
        count = 0
        found_any = False
        
        checked_count = 0
        for feature in features:
            checked_count += 1
            if not found_any:
                print(f" DEBUG: Feature {checked_count} keys: {list(feature.keys())}")
                props = feature.get('properties', {})
                print(f" DEBUG: Feature {checked_count} properties: {props}")
                if props or checked_count > 10:
                    found_any = True
            
            # If properties are empty, we might be looking at the wrong structure or empty features
            props = feature.get('properties', {})
            if not props:
                continue
            
            # Detect the ID and the NDVI value from your JSON structure
            # Adjust 'cell_id' and 'ndvi' to match your actual JSON property names
            cell_id = props.get('cell_id') or feature.get('id')
            ndvi_val = props.get('ndvi') or props.get('mean') or props.get('NDVI')
            
            if cell_id is not None and ndvi_val is not None:
                batch.append({
                    "cell_id": cell_id,
                    "ndvi_2026": float(ndvi_val)
                })
                
            if len(batch) >= BATCH_SIZE:
                # Batch update using Supabase upsert
                supabase.table("grid_cells").upsert(batch).execute()
                count += len(batch)
                print(f" Processed {count} cells...")
                batch = []

        # Final batch
        if batch:
            supabase.table("grid_cells").upsert(batch).execute()
            count += len(batch)

    print(f" Success! Integrated NDVI for {count} cells into the Digital Twin.")

if __name__ == "__main__":
    ingest_ndvi()
