-- Seka Kama: New Ecological Data Layers
-- Adding prey density, climate, and conflict data to the grid system.

ALTER TABLE public.grid_cells 
ADD COLUMN IF NOT EXISTS prey_density FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_rainfall_mm FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS hwc_risk_score FLOAT DEFAULT 0;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_grid_cells_prey ON public.grid_cells(prey_density);
CREATE INDEX IF NOT EXISTS idx_grid_cells_rainfall ON public.grid_cells(annual_rainfall_mm);

-- Helper function to update these values in bulk
-- Usage: SELECT update_cell_ecological_data(123, 15.5, 850.0, 0.4);
CREATE OR REPLACE FUNCTION update_cell_ecological_data(
    target_cell_id INTEGER,
    new_prey FLOAT,
    new_rainfall FLOAT,
    new_hwc FLOAT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.grid_cells
    SET 
        prey_density = new_prey,
        annual_rainfall_mm = new_rainfall,
        hwc_risk_score = new_hwc
    WHERE cell_id = target_cell_id;
END;
$$ LANGUAGE plpgsql;
