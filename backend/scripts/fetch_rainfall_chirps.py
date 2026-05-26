# backend/scripts/fetch_rainfall_chirps.py
import requests
import time
import logging
from typing import Optional

# Using the public SERVIR ClimateSERV API to fetch REAL CHIRPS data
# No authentication key is required for this endpoint.

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fetch_real_chirps_annual(lon: float, lat: float, year: int = 2023) -> Optional[float]:
    """
    Fetches the total annual rainfall (mm) for a coordinate point using CHIRPS v2.0.
    Uses the SERVIR ClimateSERV API.
    """
    api_root = "https://climateserv.servirglobal.net/api"
    submit_url = f"{api_root}/submitDataRequest/"
    progress_url = f"{api_root}/getDataRequestProgress/"
    data_url = f"{api_root}/getDataFromRequest/"
    
    # ClimateSERV Parameters
    # 0 = CHIRPS
    # 5 = Yearly Sum (Aggregation)
    params = {
        "datatype": 0,  # CHIRPS
        "begintime": f"01/01/{year}",
        "endtime": f"12/31/{year}",
        "intervaltype": 2, # Annual
        "operationtype": 5, # Sum
        "geometry": f'{{"type":"Point","coordinates":[{lon},{lat}]}}'
    }

    try:
        logger.info(f"Submitting CHIRPS request for ({lat}, {lon}) Year: {year}...")
        # Step 1: Submit request
        response = requests.get(submit_url, params=params, timeout=30)
        if response.status_code != 200:
            logger.error(f"API Error: {response.status_code}")
            return None
        
        request_id = response.json()[0]
        logger.info(f"Request submitted. ID: {request_id}. Waiting for processing...")

        # Step 2: Poll for progress
        progress_url = "https://climateserv.servirglobal.net/chirps/getDataRequestProgress"
        data_url = "https://climateserv.servirglobal.net/chirps/getDataFromRequestID"
        
        for _ in range(15): # Max 15 attempts (approx 30s)
            time.sleep(2)
            progress = requests.get(progress_url, params={"id": request_id}).json()[0]
            if progress == 100:
                logger.info("Data ready. Fetching results...")
                data_resp_raw = requests.get(data_url, params={"id": request_id}, timeout=30)
                
                try:
                    data_resp = data_resp_raw.json()
                except Exception:
                    logger.error(f"Failed to parse JSON from results. Status: {data_resp_raw.status_code}")
                    logger.error(f"Response snippet: {data_resp_raw.text[:200]}")
                    return None

                # Extract the value from the response
                if data_resp and "data" in data_resp:
                    val_data = data_resp["data"]
                    if val_data and len(val_data) > 0:
                        val = val_data[0].get("value")
                        if val is not None:
                            logger.info(f"Success! Annual Rainfall: {float(val):.1f} mm")
                            return float(val)
                
                logger.warning(f"Unexpected response format: {data_resp}")
                break
            elif progress == -1:
                logger.error("ClimateSERV task failed.")
                return None
        
        logger.warning("Request timed out.")
        return None

    except Exception as e:
        logger.error(f"Fetch error: {e}")
        return None

if __name__ == "__main__":
    # Test with a point in the Seka Kama landscape (Maasai Mara region)
    # Approx: 35.2, -1.5
    res = fetch_real_chirps_annual(35.2, -1.5, 2023)
    if res:
        print(f"\nREAL DATA ACQUIRED:")
        print(f"Location: 35.2, -1.5 (Seka Kama)")
        print(f"Year: 2023")
        print(f"Total Rainfall: {res:.1f} mm")
    else:
        print("\nFailed to fetch real data. Ensure you have internet access and the API is up.")
