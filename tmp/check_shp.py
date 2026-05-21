import geopandas as gpd
try:
    gdf = gpd.read_file('/tif/SekaKama_MaraGrid_NDVI_2025.shp')
    with open('/tmp/shp_cols.txt', 'w') as f:
        f.write(str(gdf.columns.tolist()))
except Exception as e:
    with open('/tmp/shp_cols.txt', 'w') as f:
        f.write(f"Error: {e}")
