"""
Verifies GBIF backbone taxon keys for Maasai Mara prey species via live API call.
Run once: python backend/scripts/verify_gbif_keys.py
"""
import requests

SPECIES = [
    "Equus quagga",
    "Connochaetes taurinus",
    "Eudorcas thomsonii",
    "Syncerus caffer",
    "Damaliscus lunatus",
    "Aepyceros melampus",
    "Phacochoerus africanus",
]

print("Verifying GBIF taxon keys...\n")
keys = {}
for name in SPECIES:
    try:
        r = requests.get(
            "https://api.gbif.org/v1/species/match",
            params={"name": name, "kingdom": "Animalia", "strict": "true"},
            timeout=8,
        )
        data = r.json()
        key = data.get("usageKey") or data.get("speciesKey")
        status = data.get("matchType", "NONE")
        print(f"  {name:<30} → key={key}  [{status}]")
        keys[name] = key
    except Exception as e:
        print(f"  {name:<30} → ERROR: {e}")

print("\nDone.")
