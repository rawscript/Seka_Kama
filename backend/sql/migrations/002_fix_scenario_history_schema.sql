-- Migration: Fix scenario_history schema
ALTER TABLE public.scenario_history 
ADD COLUMN IF NOT EXISTS baseline_total_lions FLOAT DEFAULT 0;

ALTER TABLE public.scenario_history 
ADD COLUMN IF NOT EXISTS predicted_total_lions FLOAT DEFAULT 0;

ALTER TABLE public.scenario_history 
ADD COLUMN IF NOT EXISTS delta_lions FLOAT DEFAULT 0;

ALTER TABLE public.scenario_history 
ADD COLUMN IF NOT EXISTS delta_percent FLOAT DEFAULT 0;

ALTER TABLE public.scenario_history 
ADD COLUMN IF NOT EXISTS affected_cells INTEGER DEFAULT 0;

ALTER TABLE public.scenario_history 
ADD COLUMN IF NOT EXISTS llm_narrative TEXT;

ALTER TABLE public.scenario_history 
ADD COLUMN IF NOT EXISTS scenario_geojson JSONB;

ALTER TABLE public.scenario_history 
ADD COLUMN IF NOT EXISTS request_data JSONB;

ALTER TABLE public.scenario_history 
ADD COLUMN IF NOT EXISTS modified_features JSONB;

ALTER TABLE public.scenario_history 
ADD COLUMN IF NOT EXISTS user_description TEXT;

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_scenario_history_user_id 
ON public.scenario_history(user_id);

CREATE INDEX IF NOT EXISTS idx_scenario_history_created_at 
ON public.scenario_history(created_at DESC);

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'scenario_history'
ORDER BY ordinal_position;
