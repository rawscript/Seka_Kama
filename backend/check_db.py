bkeimport os
import sys
# Add current directory to path so it can find core
sys.path.append(os.getcwd())

from core.database import SupabaseService
from dotenv import load_dotenv

load_dotenv()

def test_connection():
    try:
        db = SupabaseService()
        print("Successfully connected to Supabase")
        # Try to list keys for a dummy user ID to check if table exists
        keys = db.list_api_keys(0)
        print(f"API keys table exists, found {len(keys)} keys for user 0")
    except Exception as e:
        print(f"Error connecting or querying api_keys: {str(e)}")

if __name__ == "__main__":
    test_connection()
