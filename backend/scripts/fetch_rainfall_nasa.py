# backend/scripts/fetch_rainfall_nasa.py
import requests
import logging
from typing import Optional

# Using NASA POWER API (Prediction of Worldwide Energy Resources)
# High reliability, single-step request, and requires no authentication.

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_real_nasa_annual_rainfall(lon: float, lat: float, year: int = 2023) -> Optional[float]:
    """
    Fetches the total annual precipitation (mm) for a coordinate point using NASA POWER API.
    """
    # NASA POWER API uses YYYYMMDD format
    start_date = f"{year}0101"
    end_date = f"{year}1231"
    
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": "PRECTOTCORR", # Corrected Predicted Precipitation
        "community": "AG",         # Agroclimatology
        "longitude": lon,
        "latitude": lat,
        "start": start_date,
        "end": end_date,
        "format": "JSON"
    }

    try:
        logger.info(f"Fetching NASA POWER precipitation for ({lat}, {lon}) Year: {year}...")
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code != 200:
            logger.error(f"NASA Power API Error: {response.status_code}")
            return None
        
        data = response.json()
        
        # Extract daily values
        daily_precip = data.get("properties", {}).get("parameter", {}).get("PRECTOTCORR", {})
        
        if not daily_precip:
            logger.warning("No precipitation data found in response.")
            return None
            
        # Sum the daily values to get the annual total
        total_rainfall = sum(val for val in daily_precip.values() if val >= 0)
        
        logger.info(f"Success! Total Annual Rainfall: {total_rainfall:.2f} mm")
        return float(total_rainfall)

    except Exception as e:
        logger.error(f"NASA Power fetch error: {e}")
        return None

if __name__ == "__main__":
    # Test with Sekenani, Maasai Mara region
    res = fetch_real_nasa_annual_rainfall(35.24, -1.52, 2023)
    if res:
        print(f"\nREAL DATA ACQUIRED (NASA POWER):")
        print(f"Location: 35.24, -1.52 (Sekenani Area)")
        print(f"Year: 2023")
        print(f"Total Rainfall: {res:.2f} mm")
    else:
        print("\nFailed to fetch real data from NASA POWER.")
