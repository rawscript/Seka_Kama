#!/usr/bin/env python3
"""
Quick check for year field in grid_cells table
"""
import os
import sys
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print('ERROR: Missing Supabase credentials')
    sys.exit(1)

try:
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Checking grid_cells table for year data...")
    
    # Get sample data
    result = client.table('grid_cells').select('cell_id, year, baseline_lion_density, management_unit').limit(10).execute()
    
    print("\nSample rows:")
    for i, row in enumerate(result.data):
        print(f"  Row {i}: cell_id={row.get('cell_id')}, year={row.get('year')}, density={row.get('baseline_lion_density')}, unit={row.get('management_unit')}")
    
    # Check for distinct years
    print("\nChecking distinct years...")
    
    # Method 1: Try to get distinct years
    try:
        # Some Supabase setups support distinct queries
        result = client.table('grid_cells').select('year').execute()
        years = set()
        for row in result.data:
            if 'year' in row and row['year'] is not None:
                years.add(row['year'])
        print(f"Found {len(years)} distinct years: {sorted(years)}")
    except Exception as e:
        print(f"Could not get distinct years directly: {e}")
    
    # Method 2: Check if year field exists at all
    print("\nChecking column structure...")
    try:
        # Get one row with all columns
        result = client.table('grid_cells').select('*').limit(1).execute()
        if result.data:
            columns = list(result.data[0].keys())
            print(f"Columns in grid_cells: {sorted(columns)}")
            if 'year' in columns:
                print("✓ 'year' column exists in grid_cells table")
            else:
                print("✗ 'year' column NOT found in grid_cells table")
    except Exception as e:
        print(f"Error checking columns: {e}")
    
    # Count rows with year data
    print("\nCounting rows with year data...")
    try:
        # Count total rows
        count_result = client.table('grid_cells').select('*', count='exact').execute()
        total = count_result.count if hasattr(count_result, 'count') else 'unknown'
        
        # Count rows with year
        year_count_result = client.table('grid_cells').select('*', count='exact').not_.is_('year', 'null').execute()
        year_count = year_count_result.count if hasattr(year_count_result, 'count') else 'unknown'
        
        print(f"Total rows: {total}")
        print(f"Rows with year data: {year_count}")
        if total != 'unknown' and year_count != 'unknown':
            print(f"Percentage with year data: {(year_count/total*100):.1f}%")
    except Exception as e:
        print(f"Error counting rows: {e}")

except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure supabase-py is installed: pip install supabase")
except Exception as e:
    print(f"Error: {e}")