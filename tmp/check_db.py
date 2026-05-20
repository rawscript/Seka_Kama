import os
from supabase import create_client

def check_table():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    client = create_client(url, key)
    
    try:
        # Check users table
        users = client.table("users").select("count").limit(1).execute()
        print(f"Users table: OK")
        
        # Check api_keys table
        keys = client.table("api_keys").select("count").limit(1).execute()
        print(f"api_keys table: OK")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_table()
