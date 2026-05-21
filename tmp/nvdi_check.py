import geopandas as gpd

# Load your newly downloaded Earth Engine shapefile
gdf = gpd.read_file("/tif/SekaKama_MaraGrid_NDVI_2025.shp")

# Print the exact column names
print("Shapefile Columns:", gdf.columns.tolist())
print("\nFirst row sample:\n", gdf.head(1))