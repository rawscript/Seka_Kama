import geopandas as gpd
try:
    gdf = gpd.read_file('e:/Main/Projects/opensource/seka/Seka_Kama/tif/SekaKama_MaraGrid_NDVI_2025.shp')
    with open('e:/Main/Projects/opensource/seka/Seka_Kama/tmp/shp_cols.txt', 'w') as f:
        f.write(str(gdf.columns.tolist()))
except Exception as e:
    with open('e:/Main/Projects/opensource/seka/Seka_Kama/tmp/shp_cols.txt', 'w') as f:
        f.write(f"Error: {e}")
