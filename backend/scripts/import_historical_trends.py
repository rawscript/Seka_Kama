import pandas as pd
from supabase import create_client
import os
import sys
from dotenv import load_dotenv

load_dotenv()

def ingest(file_path):
    if not os.path.exists(file_path):
        print(f"Error: file {file_path} not found")
        return

    print(f"Reading {file_path}...")
    df = pd.read_csv(file_path)
    
    # Map columns to our schema
    records = []
    for _, row in df.iterrows():
        records.append({
            "year": int(row['year']),
            "management_unit": "Regional Total",  # These stats appear to be regional
            "lion_count": float(row['lion_abundance']),
            "metadata": {
                "lion_density": float(row['lion_density']),
                "cheetah_abundance": float(row['cheetah_abundance']),
                "cheetah_density": float(row['cheetah_density'])
            },
            "source": "Historical CSV"
        })
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        return

    supabase = create_client(url, key)
    print(f"Upserting {len(records)} records to 'historical_stats'...")
    
    try:
        supabase.table("historical_stats").upsert(records).execute()
        print("Successfully ingested historical trends.")
    except Exception as e:
        print(f"Ingestion failed: {e}")
        print("Tip: Make sure you ran the SQL to create the table first!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_historical_trends.py <path_to_csv>")
    else:
        ingest(sys.argv[1])

