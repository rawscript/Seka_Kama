import json
import os
import ijson  # High performance for large JSON files
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Config
JSON_PATH = "mara_NDVI_2026.json" # Place your file here
BATCH_SIZE = 500

def ingest_ndvi():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)

    print(f" Starting NDVI ingestion from {JSON_PATH}...")

    # We use ijson to stream the file instead of loading 615MB into memory
    with open(JSON_PATH, 'rb') as f:
        # Assuming the JSON is a FeatureCollection
        features = ijson.items(f, 'features.item')
        
        batch = []
        count = 0
        
        for feature in features:
            # Detect the ID and the NDVI value from your JSON structure
            # Adjust 'cell_id' and 'ndvi' to match your actual JSON property names
            cell_id = feature['properties'].get('cell_id')
            ndvi_val = feature['properties'].get('ndvi') or feature['properties'].get('mean')
            
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
