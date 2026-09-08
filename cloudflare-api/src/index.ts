import bcrypt from 'bcryptjs';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  JWT_SECRET_KEY: string;
  ALLOWED_ORIGIN: string;
  MODEL_VERSION: string;
}

type Cell = Record<string, unknown>;
type User = { id: number; email: string; role?: string; is_active?: boolean; password_hash: string; [key: string]: unknown };
type Identity = { user_id: number; email: string; role: string };

const json = (body: unknown, status = 200, extra: HeadersInit = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
});

function cors(request: Request, env: Env): Headers {
  const headers = new Headers({
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'Authorization, Content-Type, X-API-Key',
    'access-control-max-age': '86400',
    'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'strict-origin-when-cross-origin',
  });
  if (request.headers.get('Origin') === env.ALLOWED_ORIGIN) headers.set('access-control-allow-origin', env.ALLOWED_ORIGIN);
  return headers;
}

function base64url(value: string | ArrayBuffer) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
  let raw = ''; for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeBase64url(value: string) { return new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))); }
async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}
async function issueToken(identity: Identity, env: Env) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub: identity.email, ...identity, iat: now, exp: now + 1800 }));
  return `${header}.${payload}.${await hmac(`${header}.${payload}`, env.JWT_SECRET_KEY)}`;
}
async function identity(request: Request, env: Env): Promise<Identity | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature || signature !== await hmac(`${header}.${payload}`, env.JWT_SECRET_KEY)) return null;
  try {
    const parsed = JSON.parse(decodeBase64url(payload));
    if (!parsed.sub || !parsed.user_id || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: parsed.sub, user_id: Number(parsed.user_id), role: parsed.role || 'analyst' };
  } catch { return null; }
}

async function db(env: Env, path: string, init: RequestInit = {}) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', Prefer: 'return=representation', ...init.headers },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}
const num = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const geometry = (cell: Cell) => typeof cell.geom === 'string' ? JSON.parse(cell.geom) : cell.geom;
const feature = (cell: Cell, props: Record<string, unknown>) => ({ type: 'Feature', geometry: geometry(cell), properties: props });

async function cells(env: Env, params: URLSearchParams, limit = 50000) {
  const query = new URLSearchParams({ select: '*', limit: String(limit) });
  const unit = params.get('management_unit'); const year = params.get('year');
  if (unit) query.set('management_unit', `eq.${unit}`);
  if (year) query.set('year', `eq.${year}`);
  return db(env, `grid_cells?${query}`) as Promise<Cell[]>;
}
function applyScenario(cell: Cell, changes: Record<string, number>, years: number) {
  // Sensitivity coefficients are explicit ecological assumptions, not fabricated model output.
  const nightlight = changes.all_mean_mean ?? changes.nightlight_intensity ?? 0;
  const humanPopulation = changes.pop2018_mean ?? 0;
  const protectedDistance = changes.dist_to_protected_km ?? 0;
  const rainfall = changes.annual_rainfall_mm ?? 0;
  const prey = changes.prey_density ?? 0;
  const conflict = changes.hwc_risk_score ?? 0;
  const trend = changes.longterm_slope_mean ?? 0;
  const annualPressure = -0.012 * Math.max(0, nightlight) - 0.008 * Math.max(0, humanPopulation) - 0.015 * Math.max(0, conflict) - 0.010 * Math.max(0, trend);
  const response = annualPressure + 0.006 * rainfall + 0.018 * prey - 0.006 * Math.max(0, protectedDistance);
  const multiplier = Math.max(0, Math.min(3, 1 + response * Math.max(1, years || 1)));
  return num(cell.baseline_lion_density) * multiplier;
}
function narrative(delta: number, years: number, count: number) {
  const direction = delta > 0 ? 'increase' : delta < 0 ? 'decline' : 'no material change';
  return `The scenario evaluates ${count} intersecting grid cells and estimates a ${direction} of ${Math.abs(delta).toFixed(2)} lions${years ? ` over ${years} year${years === 1 ? '' : 's'}` : ''}. This is a bounded sensitivity estimate derived from the selected cells and declared land-use changes; it is not a replacement for a retrained field-validated model.`;
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/api/, '') || '/';
  if (path === '/health') return json({ status: 'healthy', timestamp: new Date().toISOString(), database: 'configured', model_loaded: false, version: env.MODEL_VERSION, inference: 'sensitivity-engine' });
  if (path === '/cors-check') return json({ origin: request.headers.get('origin') || '', allowed: request.headers.get('origin') === env.ALLOWED_ORIGIN });
  if (path === '/auth/register' && request.method === 'POST') {
    const input = await request.json() as Record<string, string>;
    if (!input.email || !input.password || input.password.length < 8 || !input.full_name || !input.organization) return json({ detail: 'Email, full name, organization, and a password of at least 8 characters are required' }, 422);
    const existing = await db(env, `users?select=id&email=eq.${encodeURIComponent(input.email)}&limit=1`) as unknown[];
    if (existing.length) return json({ detail: 'Email already registered' }, 400);
    const rows = await db(env, 'users', { method: 'POST', body: JSON.stringify({ email: input.email.toLowerCase(), password_hash: await bcrypt.hash(input.password, 12), full_name: input.full_name, organization: input.organization, role: input.role || 'analyst', is_active: true }) }) as User[];
    const { password_hash: _passwordHash, ...safeUser } = rows[0];
    return json(safeUser, 201);
  }
  if (path === '/auth/login' && request.method === 'POST') {
    const input = await request.json() as { email?: string; password?: string };
    const users = await db(env, `users?select=*&email=eq.${encodeURIComponent(input.email || '')}&limit=1`) as User[];
    const user = users[0];
    if (!user || !input.password || !user.is_active || !await bcrypt.compare(input.password, user.password_hash)) return json({ detail: 'Invalid email or password' }, 401);
    const token = await issueToken({ user_id: user.id, email: user.email, role: user.role || 'analyst' }, env);
    await db(env, `users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ last_login: new Date().toISOString() }) });
    return json({ access_token: token, token_type: 'bearer', expires_in: 1800 });
  }
  const current = await identity(request, env);
  if (path === '/auth/me') {
    if (!current) return json({ detail: 'Authentication required' }, 401);
    const users = await db(env, `users?select=id,email,full_name,organization,role,created_at,last_login&id=eq.${current.user_id}&limit=1`) as User[];
    return users[0] ? json(users[0]) : json({ detail: 'User not found' }, 404);
  }
  if (path === '/baseline') {
    const rows = await cells(env, url.searchParams);
    const features = rows.map(c => feature(c, { cell_id: c.cell_id, management_unit: c.management_unit, lion_density: num(c.baseline_lion_density), all_mean_mean: num(c.all_mean_mean), longterm_slope_mean: num(c.longterm_slope_mean), dist_to_protected_km: num(c.dist_to_protected_km) }));
    return json({ type: 'FeatureCollection', features, total_lions: rows.reduce((s, c) => s + num(c.baseline_lion_density), 0), cell_count: rows.length });
  }
  if (path === '/baseline/summary' || path === '/statistics') {
    const rows = await cells(env, url.searchParams); const total = rows.reduce((s, c) => s + num(c.baseline_lion_density), 0);
    const units = [...new Set(rows.map(c => String(c.management_unit || '')).filter(Boolean))].sort();
    if (path === '/statistics') return json({ total_lions: total, total_area_km2: rows.length, avg_lion_density: rows.length ? total / rows.length : 0, avg_nightlight_intensity: rows.reduce((s, c) => s + num(c.all_mean_mean), 0) / Math.max(rows.length, 1), high_risk_cell_count: rows.filter(c => num(c.hwc_risk_score) > 0.5).length, management_unit_count: units.length, management_units: units });
    return json({ total_lions: total, avg_lion_density: total / Math.max(rows.length, 1), avg_nightlight_intensity: rows.reduce((s,c) => s + num(c.all_mean_mean),0) / Math.max(rows.length,1), avg_nightlight_trend: rows.reduce((s,c) => s + num(c.longterm_slope_mean),0) / Math.max(rows.length,1), avg_distance_to_protected: rows.reduce((s,c) => s + num(c.dist_to_protected_km),0) / Math.max(rows.length,1), cell_count: rows.length, management_units: units });
  }
  if (path === '/management-units') { const rows = await db(env, 'grid_cells?select=management_unit&limit=50000') as Cell[]; return json([...new Set(rows.map(c => String(c.management_unit || '')).filter(Boolean))].sort()); }
  if (path === '/model/metadata') return json({ model_type: 'Ecological sensitivity engine', version: env.MODEL_VERSION, training_date: null, feature_count: 7, features: ['all_mean_mean', 'pop2018_mean', 'dist_to_protected_km', 'annual_rainfall_mm', 'prey_density', 'hwc_risk_score', 'longterm_slope_mean'], objective: 'bounded scenario sensitivity', performance_metrics: null });
  if (path === '/feature-importance') return json({ feature_importance: [
    { feature: 'hwc_risk_score', importance: 0.15 }, { feature: 'all_mean_mean', importance: 0.12 }, { feature: 'prey_density', importance: 0.018 }, { feature: 'annual_rainfall_mm', importance: 0.006 }, { feature: 'dist_to_protected_km', importance: 0.006 }, { feature: 'pop2018_mean', importance: 0.008 }, { feature: 'longterm_slope_mean', importance: 0.01 },
  ], top_feature: 'hwc_risk_score', top_importance: 0.15, method: 'declared sensitivity coefficient, not XGBoost feature importance' });
  if (path === '/predict/landscape') {
    const rows = await cells(env, url.searchParams, 2000);
    return json({ type: 'FeatureCollection', features: rows.map(c => feature(c, { cell_id: c.cell_id, management_unit: c.management_unit, baseline_density: num(c.baseline_lion_density), predicted_density: num(c.baseline_lion_density), delta: 0, model: 'baseline-no-unrequested-change' })) });
  }
  if (path === '/protected-areas') {
    const rows = await db(env, 'protected_areas?select=*&limit=1000') as Cell[];
    return json({ type: 'FeatureCollection', features: rows.map(c => feature(c, { wdpa_id: c.id, name: c.site_name, desig_eng: c.designation, iucn_cat: c.iucn_category, rep_area: num(c.area_km2) })) });
  }
  if (path === '/scenarios/trends') {
    const unit = url.searchParams.get('management_unit') || 'Regional Total';
    const rows = await db(env, `historical_stats?select=year,population_estimate&management_unit=eq.${encodeURIComponent(unit)}&order=year.asc`) as Cell[];
    return json({ unit, trends: rows.map(r => ({ year: r.year, lion_count: num(r.population_estimate) })) });
  }
  if (path === '/ecosystem/indicators' || path === '/ecosystem/environment' || path === '/ecosystem/trends') {
    const rows = await cells(env, url.searchParams, 5000); const mean = (field: string) => rows.reduce((s, c) => s + num(c[field]), 0) / Math.max(rows.length, 1);
    const rainfall = mean('annual_rainfall_mm'), prey = mean('prey_density'), risk = mean('hwc_risk_score');
    if (path === '/ecosystem/environment') return json({ temperature: null, humidity: null, wind_speed: null, precipitation: rainfall, cloud_cover: null, uv_index: null, daylight_hours: null, soil_moisture: null, measurement_location: url.searchParams.get('management_unit') || 'Mara Ecosystem', measured_at: new Date().toISOString(), source: 'stored ecological grid values' });
    if (path === '/ecosystem/trends') return json([]);
    const status = risk > 0.5 ? 'critical' : risk > 0.25 ? 'warning' : 'good';
    return json({ indicators: [{ id: 'rainfall', name: 'Annual rainfall', value: rainfall, unit: 'mm', trend: 'stable', change_percentage: 0, status: 'good', description: 'Stored grid-cell mean', color: '#0891b2', data_source: 'Supabase', last_updated: new Date().toISOString() }, { id: 'prey_density', name: 'Prey density', value: prey, unit: 'index', trend: 'stable', change_percentage: 0, status, description: 'Stored grid-cell mean', color: '#65a30d', data_source: 'Supabase', last_updated: new Date().toISOString() }, { id: 'hwc_risk', name: 'Human-wildlife conflict risk', value: risk, unit: 'index', trend: 'stable', change_percentage: 0, status, description: 'Stored grid-cell mean', color: '#dc2626', data_source: 'Supabase', last_updated: new Date().toISOString() }], overall_health: status, environmental_context: { season: 'data-dependent', climate_zone: 'Mara Ecosystem', conservation_status: status }, generated_at: new Date().toISOString() });
  }
  if (path === '/scenario' && request.method === 'POST') {
    if (!current) return json({ detail: 'Authentication required' }, 401);
    const input = await request.json() as { geometry?: unknown; feature_modifications?: Record<string, number>; management_units?: string[]; user_query?: string; simulation_years?: number };
    if (!input.geometry || !input.feature_modifications) return json({ detail: 'geometry and feature_modifications are required' }, 422);
    const rawGeometry = (input.geometry as { type?: string; geometry?: unknown }).type === 'Feature' ? (input.geometry as { geometry: unknown }).geometry : input.geometry;
    const affected = await db(env, 'rpc/get_cells_in_geometry', { method: 'POST', body: JSON.stringify({ geom_geojson: rawGeometry, units: input.management_units || [] }) }) as Cell[];
    if (!affected.length) return json({ detail: 'No habitat grid cells found in the selected simulation area' }, 400);
    const years = Math.max(0, Math.min(50, Number(input.simulation_years) || 0));
    const baseline = affected.reduce((s, c) => s + num(c.baseline_lion_density), 0);
    const outputs = affected.map(c => applyScenario(c, input.feature_modifications || {}, years));
    const predicted = outputs.reduce((s, value) => s + value, 0); const delta = predicted - baseline;
    const scenarioGeojson = { type: 'FeatureCollection', features: affected.map((c, i) => feature(c, { cell_id: c.cell_id, baseline_density: num(c.baseline_lion_density), scenario_density: outputs[i], delta: outputs[i] - num(c.baseline_lion_density) })) };
    const text = narrative(delta, years, affected.length);
    const inserted = await db(env, 'scenario_history', { method: 'POST', body: JSON.stringify({ user_id: current.user_id, user_description: input.user_query || 'Scenario analysis', modified_features: { ...input.feature_modifications, __metadata: { request_data: input, scenario_geojson: scenarioGeojson } }, baseline_total_lions: baseline, predicted_total_lions: predicted, delta_lions: delta, delta_percent: baseline ? delta / baseline * 100 : 0, affected_cells: affected.length, llm_narrative: text }) }) as Cell[];
    const id = Number(inserted[0]?.id || inserted[0]?.scenario_id || 0);
    return json({ scenario_id: id, baseline_total_lions: baseline, predicted_total_lions: predicted, delta_lions: delta, delta_percent: baseline ? delta / baseline * 100 : 0, affected_units: Object.fromEntries([...new Set(affected.map(c => String(c.management_unit || 'Unspecified')))].map(unit => [unit, affected.filter(c => String(c.management_unit || 'Unspecified') === unit).reduce((s,c) => s + num(c.baseline_lion_density), 0)])), llm_narrative: text, map_visualization_url: '', ecological_context: { engine: 'bounded sensitivity' }, scenario_geojson: scenarioGeojson, created_at: new Date().toISOString() });
  }
  if (path === '/scenarios/history') {
    if (!current) return json({ detail: 'Authentication required' }, 401);
    const rows = await db(env, `scenario_history?select=*&user_id=eq.${current.user_id}&order=created_at.desc&limit=${Math.min(100, Number(url.searchParams.get('limit')) || 50)}`) as Cell[];
    return json({ scenarios: rows, count: rows.length });
  }
  return json({ detail: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = cors(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      const response = await handleApi(request, env, new URL(request.url));
      response.headers.forEach((value, key) => headers.set(key, value));
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      console.error(error);
      return json({ detail: 'Service unavailable. Check Worker and Supabase configuration.' }, 503, headers);
    }
  },
};
