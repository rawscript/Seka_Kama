-- Seka Kama: Supabase Auth Sync & API Key Fix
-- This script fixes the most common issue: Users exist in auth.users but not in public.users.
-- It also ensures the api_keys table is perfectly configured.

-- 1. Create a trigger function to sync new users from Supabase Auth to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (email, full_name, organization, role, password_hash)
  VALUES (
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
    COALESCE(NEW.raw_user_meta_data->>'organization', 'None'),
    'analyst',
    'auth_external' -- Placeholder since auth is handled by Supabase
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    organization = EXCLUDED.organization;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to auth.users (Supabase managed table)
-- Note: This requires high-level permissions, usually available in Supabase SQL editor.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix API Keys Table and RLS
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

-- Ensure RLS is active
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy: Allow service role ALWAYS
DROP POLICY IF EXISTS "Service role bypass" ON public.api_keys;
CREATE POLICY "Service role bypass" ON public.api_keys
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Dynamic Policy: Users see their own keys
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;
CREATE POLICY "Users can view own API keys" ON public.api_keys
    FOR SELECT 
    TO authenticated
    USING (user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'));

-- Grant sequence access for ID generation
GRANT USAGE, SELECT ON SEQUENCE api_keys_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE api_keys_id_seq TO authenticated;

-- 4. Retroactively sync existing users from auth.users to public.users
INSERT INTO public.users (email, full_name, organization, role, password_hash)
SELECT 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email), 
    COALESCE(raw_user_meta_data->>'organization', 'General'),
    'analyst',
    'auth_external'
FROM auth.users
ON CONFLICT (email) DO NOTHING;

-- 5. Verification
SELECT 'Sync and API Fix Completed' as status;
