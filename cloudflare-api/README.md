# Seka Kama Cloudflare API

This Worker replaces the expired Railway runtime. It keeps Supabase as the system of record and exposes the `/api` contract used by the Vercel frontend.

The original backend loads Python pickle/XGBoost artifacts. Those artifacts cannot execute in the Workers runtime, so scenarios use a documented sensitivity calculation based on the selected, real grid cells. It is bounded (never below zero), reports the applied factors, and stores the result and GeoJSON in `scenario_history`.

## One-time database preparation

Run [`../backend/sql/fix_rpc_geometry.sql`](../backend/sql/fix_rpc_geometry.sql) in the Supabase SQL editor. It fixes the geometry RPC so a drawn scenario selects the actual intersecting grid cells.

## Deploy

1. Install Node dependencies: `npm install`
2. Authenticate: `npx wrangler login`
3. Add production secrets (never put these in `wrangler.jsonc`):

   `npx wrangler secret put SUPABASE_URL`

   `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`

   `npx wrangler secret put JWT_SECRET_KEY`
4. Deploy: `npx wrangler deploy`
5. In Vercel, set `NEXT_PUBLIC_API_URL` to `https://seka-kama-api.<your-subdomain>.workers.dev/api`, then redeploy the frontend.

For local use, copy `.dev.vars.example` to `.dev.vars`, fill in values, and run `npm run dev`.

## Security

The service role remains Worker-only; never expose it as a Vercel `NEXT_PUBLIC_*` variable. CORS admits only the configured Vercel origin, and the Worker sends standard browser security headers.
