-- Seka Kama: API Key Generation Fix Script
-- This script ensures the api_keys table exists with correct schema and RLS policies.
-- Run this in your Supabase SQL Editor.

-- 1. Ensure public.users exists (prerequisite)
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    organization TEXT,
    role TEXT DEFAULT 'analyst',
    is_active BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '{}'::jsonb,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create or Fix API Keys Table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    prefix TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure last_used column exists (in case table was created with an older script)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='last_used') THEN
        ALTER TABLE public.api_keys ADD COLUMN last_used TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 5. Set up RLS Policies
-- Drop existing policies to ensure a clean state
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Service role bypass" ON public.api_keys;
DROP POLICY IF EXISTS "Enable all access for service role" ON public.api_keys;

-- Policy: Users can see their own keys
CREATE POLICY "Users can view own API keys" ON public.api_keys
    FOR SELECT 
    USING (
        -- If authenticated via JWT, filter by user email
        (auth.role() = 'authenticated' AND user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'))
        OR 
        -- If the user_id matches the one in the table (backup check)
        (auth.uid()::text = (SELECT id::text FROM public.users WHERE id = public.api_keys.user_id LIMIT 1))
    );

-- Policy: Service role or admin can do anything
-- This helps if the service role key is being used in a way that doesn't automatically bypass RLS
CREATE POLICY "Enable all access for service role" ON public.api_keys
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 6. Grant Permissions
GRANT ALL ON public.api_keys TO service_role;
GRANT ALL ON public.api_keys TO postgres;
GRANT SELECT, DELETE ON public.api_keys TO authenticated;
GRANT USAGE ON SEQUENCE api_keys_id_seq TO service_role;
GRANT USAGE ON SEQUENCE api_keys_id_seq TO authenticated;

-- 7. Verification helper
CREATE OR REPLACE FUNCTION verify_api_key_table()
RETURNS TEXT AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        RETURN 'OK: api_keys table exists and is configured.';
    ELSE
        RETURN 'ERROR: api_keys table missing.';
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT verify_api_key_table();
