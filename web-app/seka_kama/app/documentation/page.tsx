'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Book, Terminal, Code2, Database, ChevronRight, Shield, Key, BarChart3, Layers, Brain, Download, Activity, Lock, Copy, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// ── Code Block Component ──────────────────────────────────────────────────────

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-sm overflow-hidden border border-[#775a19]/20">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1c1c] border-b border-[#775a19]/20">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7f7667]">{language}</span>
        <button onClick={handleCopy} className="text-[#7f7667] hover:text-[#ffdea5] transition-colors p-1" title="Copy">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="bg-[#1a1c1c] p-5 font-mono text-[13px] text-[#ffdea5] overflow-x-auto leading-relaxed whitespace-pre">
        {children}
      </pre>
    </div>
  );
}

// ── Method Badge ──────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    POST: 'bg-blue-100 text-blue-800 border-blue-200',
    DELETE: 'bg-rose-100 text-rose-800 border-rose-200',
    PUT: 'bg-amber-100 text-amber-800 border-amber-200',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider rounded border ${colors[method] || 'bg-gray-100 text-gray-700'}`}>
      {method}
    </span>
  );
}

// ── Endpoint Card ─────────────────────────────────────────────────────────────

interface EndpointProps {
  id: string;
  method: string;
  path: string;
  description: string;
  auth?: boolean;
  params?: { name: string; type: string; required: boolean; desc: string }[];
  requestBody?: string;
  responseBody?: string;
}

function EndpointCard({ id, method, path, description, auth, params, requestBody, responseBody }: EndpointProps) {
  const [open, setOpen] = useState(false);

  return (
    <div id={id} className="border border-[#d1c5b4]/50 rounded-lg overflow-hidden bg-white scroll-mt-28 hover:border-[#775a19]/30 transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-[#f5f0e8]/40 transition-colors"
      >
        <MethodBadge method={method} />
        <code className="text-sm font-mono text-[#1a1c1c] font-semibold flex-1">{path}</code>
        {auth && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#775a19]/70">
            <Lock className="w-3 h-3" /> Auth
          </span>
        )}
        <ChevronRight className={`w-4 h-4 text-[#775a19] transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-5 border-t border-[#d1c5b4]/30 pt-5 animate-in fade-in duration-200">
          <p className="text-sm text-[#4e4639] leading-relaxed">{description}</p>

          {params && params.length > 0 && (
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#775a19] mb-3">Parameters</h5>
              <div className="border border-[#d1c5b4]/40 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f5f0e8]/60 text-left">
                      <th className="px-4 py-2.5 font-bold text-[#1a1c1c] text-xs">Name</th>
                      <th className="px-4 py-2.5 font-bold text-[#1a1c1c] text-xs">Type</th>
                      <th className="px-4 py-2.5 font-bold text-[#1a1c1c] text-xs">Required</th>
                      <th className="px-4 py-2.5 font-bold text-[#1a1c1c] text-xs">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {params.map(p => (
                      <tr key={p.name} className="border-t border-[#d1c5b4]/20">
                        <td className="px-4 py-2.5 font-mono text-[#775a19] text-xs font-semibold">{p.name}</td>
                        <td className="px-4 py-2.5 text-[#4e4639] text-xs">{p.type}</td>
                        <td className="px-4 py-2.5 text-xs">
                          {p.required ? <span className="text-rose-600 font-bold">Yes</span> : <span className="text-[#7f7667]">No</span>}
                        </td>
                        <td className="px-4 py-2.5 text-[#4e4639] text-xs">{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {requestBody && (
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#775a19] mb-3">Request Body</h5>
              <CodeBlock language="json">{requestBody}</CodeBlock>
            </div>
          )}

          {responseBody && (
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#775a19] mb-3">Response</h5>
              <CodeBlock language="json">{responseBody}</CodeBlock>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sidebar Section Link ──────────────────────────────────────────────────────

function SidebarLink({ label, targetId, active }: { label: string; targetId: string; active: boolean }) {
  return (
    <li>
      <a
        href={`#${targetId}`}
        className={`group flex items-center justify-between text-sm transition-colors font-light ${active ? 'text-[#775a19] font-medium' : 'text-[#4e4639] hover:text-[#1a1c1c]'
          }`}
      >
        {label}
        <ChevronRight className={`w-3 h-3 transition-opacity ${active ? 'opacity-100 text-[#775a19]' : 'opacity-0 group-hover:opacity-100'}`} />
      </a>
    </li>
  );
}

// ── Main Documentation Page ───────────────────────────────────────────────────

export default function DocumentationPage() {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => setMounted(true), []);

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0.1 }
    );

    document.querySelectorAll('section[id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [mounted]);

  const navSections = [
    {
      title: 'Getting Started', icon: Terminal, items: [
        { label: 'Overview', id: 'overview' },
        { label: 'Base URL', id: 'base-url' },
        { label: 'Authentication', id: 'authentication' },
        { label: 'Error Handling', id: 'errors' },
      ]
    },
    {
      title: 'Authentication', icon: Shield, items: [
        { label: 'Register', id: 'auth-register' },
        { label: 'Login', id: 'auth-login' },
        { label: 'Current User', id: 'auth-me' },
        { label: 'Logout', id: 'auth-logout' },
      ]
    },
    {
      title: 'Spatial Data', icon: Database, items: [
        { label: 'Baseline Grid', id: 'baseline' },
        { label: 'Baseline Summary', id: 'baseline-summary' },
        { label: 'Protected Areas', id: 'protected-areas' },
        { label: 'Statistics', id: 'statistics' },
      ]
    },
    {
      title: 'Scenario Engine', icon: Brain, items: [
        { label: 'Run Scenario', id: 'scenario-run' },
        { label: 'Scenario History', id: 'scenario-history' },
        { label: 'Get Scenario', id: 'scenario-by-id' },
        { label: 'Historical Trends', id: 'scenario-trends' },
      ]
    },
    {
      title: 'Model Insights', icon: BarChart3, items: [
        { label: 'Feature Importance', id: 'feature-importance' },
        { label: 'Model Metadata', id: 'model-metadata' },
        { label: 'Explain Prediction', id: 'explain' },
        { label: 'Explain Cell', id: 'explain-cell' },
      ]
    },
    {
      title: 'Data & Keys', icon: Key, items: [
        { label: 'Grid Export', id: 'grid-export' },
        { label: 'List API Keys', id: 'keys-list' },
        { label: 'Create API Key', id: 'keys-create' },
        { label: 'Revoke API Key', id: 'keys-revoke' },
      ]
    },
  ];

  return (
    <div className="bg-[#f9f9f9] min-h-screen flex flex-col selection:bg-[#775a19]/10 selection:text-[#4e3700]">
      <Navbar />

      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-12 py-20 px-6 md:px-20 w-full flex-grow">
        {/* ── Sidebar Navigation ─────────────────────────────────── */}
        <aside className={`w-full lg:w-72 flex-shrink-0 space-y-8 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto ${mounted ? 'animate-in' : 'opacity-0'}`}>
          {navSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="text-[11px] font-bold text-[#775a19] uppercase tracking-[0.2em] flex items-center gap-3">
                <section.icon className="w-4 h-4" /> {section.title}
              </h4>
              <ul className="space-y-2.5 pl-7">
                {section.items.map(item => (
                  <SidebarLink key={item.id} label={item.label} targetId={item.id} active={activeSection === item.id} />
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* ── Main Content ───────────────────────────────────────── */}
        <main className={`flex-1 space-y-16 min-w-0 ${mounted ? 'animate-in' : 'opacity-0'}`} style={{ animationDelay: '200ms', animationFillMode: 'both' }}>

          {/* ── Overview ──────────────────────────────────────────── */}
          <section id="overview" className="space-y-4">
            <p className="text-[11px] font-bold text-[#775a19] mb-4 tracking-[0.3em] uppercase">API Reference</p>
            <h1 className="text-5xl font-normal text-[#1a1c1c] tracking-tight leading-tight">
              Technical <span className="italic font-light text-[#4e3700]">Documentation</span>
            </h1>
            <p className="text-[#4e4639] text-lg leading-relaxed max-w-2xl font-light">
              Complete reference for the Seka Kama Digital Twin REST API. Integrate the SekaNet
              XGBoost prediction engine, spatial analysis, and lion population modelling into your
              own conservation workflows.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { label: 'v2.0.0', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { label: 'JSON API', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { label: 'Bearer Auth', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              ].map(b => (
                <span key={b.label} className={`px-3 py-1 text-[11px] font-bold rounded-full border ${b.color}`}>{b.label}</span>
              ))}
            </div>
          </section>

          {/* ── Base URL ──────────────────────────────────────────── */}
          <section id="base-url" className="space-y-4">
            <h2 className="text-2xl font-serif font-medium text-[#1a1c1c] flex items-center gap-3">
              <Layers className="w-5 h-5 text-[#775a19]" /> Base URL
            </h2>
            <p className="text-sm text-[#4e4639] leading-relaxed font-light">
              All API endpoints are relative to the following base URL. All requests must be made over HTTPS in production.
            </p>
            <CodeBlock language="text">{`https://sekakama-production-0aa3.up.railway.app/api`}</CodeBlock>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>Local Development:</strong> When running locally, the base URL is <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">http://localhost:8000/api</code>
              </p>
            </div>
          </section>

          {/* ── Authentication Guide ──────────────────────────────── */}
          <section id="authentication" className="space-y-5">
            <h2 className="text-2xl font-serif font-medium text-[#1a1c1c] flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#775a19]" /> Authentication
            </h2>
            <p className="text-sm text-[#4e4639] leading-relaxed font-light">
              Protected endpoints require a <strong>Bearer token</strong> in the <code className="bg-[#f5f0e8] px-1.5 py-0.5 rounded text-[12px] font-mono">Authorization</code> header.
              Obtain a token via the <code className="bg-[#f5f0e8] px-1.5 py-0.5 rounded text-[12px] font-mono">POST /api/auth/login</code> endpoint.
            </p>
            <CodeBlock language="http">{`Authorization: Bearer sk-seka-JhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}</CodeBlock>
            <p className="text-sm text-[#4e4639] leading-relaxed font-light">
              Tokens expire after <strong>24 hours</strong>. Re-authenticate to obtain a new token.
              For programmatic access, use an <a href="/dashboard/api-keys" className="text-[#775a19] underline underline-offset-2 hover:text-[#4e3700] font-medium">API Key</a> instead.
            </p>
          </section>

          {/* ── Error Handling ────────────────────────────────────── */}
          <section id="errors" className="space-y-5">
            <h2 className="text-2xl font-serif font-medium text-[#1a1c1c] flex items-center gap-3">
              <Activity className="w-5 h-5 text-[#775a19]" /> Error Handling
            </h2>
            <p className="text-sm text-[#4e4639] leading-relaxed font-light">
              The API uses standard HTTP status codes. Error responses include a JSON body with a <code className="bg-[#f5f0e8] px-1.5 py-0.5 rounded text-[12px] font-mono">detail</code> field.
            </p>
            <div className="border border-[#d1c5b4]/40 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f5f0e8]/60 text-left">
                    <th className="px-4 py-2.5 font-bold text-[#1a1c1c] text-xs">Code</th>
                    <th className="px-4 py-2.5 font-bold text-[#1a1c1c] text-xs">Meaning</th>
                  </tr>
                </thead>
                <tbody className="text-[#4e4639]">
                  {[
                    ['200', 'Success'],
                    ['400', 'Bad Request — invalid parameters or geometry'],
                    ['401', 'Unauthorized — invalid or missing token'],
                    ['403', 'Forbidden — insufficient role permissions'],
                    ['404', 'Not Found — resource does not exist'],
                    ['500', 'Internal Server Error'],
                  ].map(([code, desc]) => (
                    <tr key={code} className="border-t border-[#d1c5b4]/20">
                      <td className="px-4 py-2.5 font-mono text-xs font-bold">{code}</td>
                      <td className="px-4 py-2.5 text-xs">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CodeBlock language="json">{`{
  "detail": "No habitat grid cells found in the selected simulation area"
}`}</CodeBlock>
          </section>

          <hr className="border-[#d1c5b4]/60" />

          {/* ═══════════════════════════════════════════════════════
              AUTHENTICATION ENDPOINTS
              ═══════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            <h3 className="text-xl font-serif font-medium text-[#1a1c1c] flex items-center gap-3 pt-4">
              <Shield className="w-5 h-5 text-[#775a19]" /> Authentication Endpoints
            </h3>

            <section id="auth-register">
              <EndpointCard
                id="auth-register-card"
                method="POST"
                path="/api/auth/register"
                description="Create a new user account. Passwords are hashed with bcrypt before storage. Email must be unique."
                params={[
                  { name: 'email', type: 'string', required: true, desc: 'User email address' },
                  { name: 'password', type: 'string', required: true, desc: 'Password (min 8 characters)' },
                  { name: 'full_name', type: 'string', required: true, desc: 'Full display name' },
                  { name: 'organization', type: 'string', required: false, desc: 'Organization or institution name' },
                  { name: 'role', type: 'string', required: false, desc: '"viewer" (default), "analyst", or "admin"' },
                ]}
                requestBody={`{
  "email": "researcher@wildlife.org",
  "password": "securep4ssword!",
  "full_name": "Jane Mwende",
  "organization": "Kenya Wildlife Service",
  "role": "analyst"
}`}
                responseBody={`{
  "id": 42,
  "email": "researcher@wildlife.org",
  "full_name": "Jane Mwende",
  "organization": "Kenya Wildlife Service",
  "role": "analyst",
  "created_at": "2026-05-24T12:00:00",
  "last_login": null
}`}
              />
            </section>

            <section id="auth-login">
              <EndpointCard
                id="auth-login-card"
                method="POST"
                path="/api/auth/login"
                description="Authenticate with email and password. Returns a JWT access token valid for 24 hours."
                requestBody={`{
  "email": "researcher@wildlife.org",
  "password": "securep4ssword!"
}`}
                responseBody={`{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1440
}`}
              />
            </section>

            <section id="auth-me">
              <EndpointCard
                id="auth-me-card"
                method="GET"
                path="/api/auth/me"
                description="Retrieve the profile of the currently authenticated user. Used to validate tokens and display user info."
                auth
                responseBody={`{
  "id": 42,
  "email": "researcher@wildlife.org",
  "full_name": "Jane Mwende",
  "organization": "Kenya Wildlife Service",
  "role": "analyst",
  "created_at": "2026-05-24T12:00:00",
  "last_login": "2026-05-24T15:30:00"
}`}
              />
            </section>

            <section id="auth-logout">
              <EndpointCard
                id="auth-logout-card"
                method="POST"
                path="/api/auth/logout"
                description="Invalidate the current session. The client should discard the stored token."
                auth
                responseBody={`{
  "message": "Successfully logged out"
}`}
              />
            </section>
          </div>

          <hr className="border-[#d1c5b4]/60" />

          {/* ═══════════════════════════════════════════════════════
              SPATIAL DATA ENDPOINTS
              ═══════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            <h3 className="text-xl font-serif font-medium text-[#1a1c1c] flex items-center gap-3 pt-4">
              <Database className="w-5 h-5 text-[#775a19]" /> Spatial Data Endpoints
            </h3>

            <section id="baseline">
              <EndpointCard
                id="baseline-card"
                method="GET"
                path="/api/baseline"
                description="Retrieve the baseline lion density grid as a GeoJSON FeatureCollection. Supports filtering by management unit and bounding box for map viewport queries."
                params={[
                  { name: 'management_unit', type: 'string', required: false, desc: 'Filter by management unit name (e.g. "Olare-Motorogi")' },
                  { name: 'min_lon', type: 'float', required: false, desc: 'Bounding box minimum longitude' },
                  { name: 'min_lat', type: 'float', required: false, desc: 'Bounding box minimum latitude' },
                  { name: 'max_lon', type: 'float', required: false, desc: 'Bounding box maximum longitude' },
                  { name: 'max_lat', type: 'float', required: false, desc: 'Bounding box maximum latitude' },
                ]}
                responseBody={`{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [35.12, -1.45] },
      "properties": {
        "cell_id": 1024,
        "lion_density": 12.7,
        "management_unit": "Olare-Motorogi",
        "nightlight_intensity": 0.034,
        "dist_to_protected_km": 2.1
      }
    }
  ],
  "total_lions": 4287.3,
  "cell_count": 12450
}`}
              />
            </section>

            <section id="baseline-summary">
              <EndpointCard
                id="baseline-summary-card"
                method="GET"
                path="/api/baseline/summary"
                description="Get aggregated summary statistics for the baseline data, including average lion density, nightlight trends, and distance to protected areas."
                params={[
                  { name: 'management_unit', type: 'string', required: false, desc: 'Filter by management unit name' },
                ]}
                responseBody={`{
  "total_lions": 4287.3,
  "avg_lion_density": 0.344,
  "avg_nightlight_intensity": 0.058,
  "avg_nightlight_trend": 0.0012,
  "avg_distance_to_protected": 14.7,
  "cell_count": 12450,
  "management_units": ["Olare-Motorogi", "Mara North", "Naboisho"]
}`}
              />
            </section>

            <section id="protected-areas">
              <EndpointCard
                id="protected-areas-card"
                method="GET"
                path="/api/protected-areas"
                description="Retrieve WDPA and OECM protected area boundaries as GeoJSON for map overlay. Supports bounding box filtering."
                params={[
                  { name: 'min_lon', type: 'float', required: false, desc: 'Bounding box minimum longitude' },
                  { name: 'min_lat', type: 'float', required: false, desc: 'Bounding box minimum latitude' },
                  { name: 'max_lon', type: 'float', required: false, desc: 'Bounding box maximum longitude' },
                  { name: 'max_lat', type: 'float', required: false, desc: 'Bounding box maximum latitude' },
                ]}
                responseBody={`{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Polygon", "coordinates": [[...]] },
      "properties": {
        "wdpa_id": 555597,
        "name": "Maasai Mara National Reserve",
        "desig_eng": "National Reserve",
        "iucn_cat": "II",
        "rep_area": 1510.0
      }
    }
  ]
}`}
              />
            </section>

            <section id="statistics">
              <EndpointCard
                id="statistics-card"
                method="GET"
                path="/api/statistics"
                description="Comprehensive landscape statistics for dashboard reporting. Returns total lion count, area, protected area coverage, high-risk cell count, and more."
                params={[
                  { name: 'management_unit', type: 'string', required: false, desc: 'Filter by management unit name' },
                ]}
                responseBody={`{
  "total_lions": 4287.3,
  "total_area_km2": 12450,
  "avg_lion_density": 0.344,
  "protected_area_coverage_km2": 3200.5,
  "avg_nightlight_trend": 0.0012,
  "high_risk_cell_count": 847,
  "management_unit_count": 15
}`}
              />
            </section>
          </div>

          <hr className="border-[#d1c5b4]/60" />

          {/* ═══════════════════════════════════════════════════════
              SCENARIO ENGINE ENDPOINTS
              ═══════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            <h3 className="text-xl font-serif font-medium text-[#1a1c1c] flex items-center gap-3 pt-4">
              <Brain className="w-5 h-5 text-[#775a19]" /> Scenario Simulation Engine
            </h3>
            <p className="text-sm text-[#4e4639] leading-relaxed font-light max-w-2xl">
              The scenario engine runs what-if simulations using the SekaNet XGBoost model. Draw a geometry on the map,
              modify environmental features, and receive a prediction of lion population change with an
              AI-generated narrative explanation via NVIDIA NeMo.
            </p>

            <section id="scenario-run">
              <EndpointCard
                id="scenario-run-card"
                method="POST"
                path="/api/scenario"
                description="Run a what-if simulation by providing a GeoJSON geometry and feature modifications. Requires authentication. The scenario is persisted to your history for future retrieval."
                auth
                requestBody={`{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[35.1, -1.5], [35.3, -1.5], [35.3, -1.3], [35.1, -1.3], [35.1, -1.5]]]
  },
  "feature_modifications": {
    "longterm_slope_mean": 0.15,
    "all_skew_std": 0.05
  },
  "management_units": ["Olare-Motorogi", "Mara North"],
  "user_query": "What if a new lodge is built in this area?"
}`}
                responseBody={`{
  "scenario_id": 128,
  "baseline_total_lions": 342.7,
  "predicted_total_lions": 318.2,
  "delta_lions": -24.5,
  "delta_percent": -7.15,
  "affected_units": {
    "Olare-Motorogi": -15.2,
    "Mara North": -9.3
  },
  "llm_narrative": "The proposed development would increase nightlight intensity by 15% across the selected area, reducing lion density by approximately 7.15%...",
  "map_visualization_url": "/api/maps/scenario/128"
}`}
              />
            </section>

            <section id="scenario-history">
              <EndpointCard
                id="scenario-history-card"
                method="GET"
                path="/api/scenarios/history"
                description="Retrieve your scenario simulation history. Results are ordered by most recent. Used for RAG memory and revisiting previous simulations."
                auth
                params={[
                  { name: 'limit', type: 'integer', required: false, desc: 'Max results to return (1-500, default 50)' },
                ]}
                responseBody={`{
  "scenarios": [
    {
      "scenario_id": 128,
      "user_description": "Lodge development impact",
      "predicted_lion_delta": -24.5,
      "affected_cells": 156,
      "created_at": "2026-05-24T12:00:00"
    }
  ],
  "count": 12,
  "user_id": 42
}`}
              />
            </section>

            <section id="scenario-by-id">
              <EndpointCard
                id="scenario-by-id-card"
                method="GET"
                path="/api/scenarios/history/{scenario_id}"
                description="Retrieve a specific scenario simulation by its ID. Only returns scenarios owned by the authenticated user."
                auth
                params={[
                  { name: 'scenario_id', type: 'integer', required: true, desc: 'The unique scenario identifier' },
                ]}
                responseBody={`{
  "scenario_id": 128,
  "user_id": 42,
  "user_description": "Lodge development impact",
  "modified_features": { "longterm_slope_mean": 0.15, "all_skew_std": 0.05 },
  "predicted_lion_delta": -24.5,
  "affected_cells": 156,
  "llm_narrative": "The proposed development would...",
  "created_at": "2026-05-24T12:00:00"
}`}
              />
            </section>

            <section id="scenario-trends">
              <EndpointCard
                id="scenario-trends-card"
                method="GET"
                path="/api/scenarios/trends"
                description="Historical lion population trends for a given management unit. Used for comparison against scenario predictions."
                params={[
                  { name: 'management_unit', type: 'string', required: false, desc: 'Filter by unit (default "Regional Total")' },
                ]}
                responseBody={`{
  "unit": "Regional Total",
  "trends": [
    { "year": 2012, "population": 2100 },
    { "year": 2016, "population": 2340 },
    { "year": 2020, "population": 2890 },
    { "year": 2024, "population": 4287 }
  ]
}`}
              />
            </section>
          </div>

          <hr className="border-[#d1c5b4]/60" />

          {/* ═══════════════════════════════════════════════════════
              MODEL INSIGHTS ENDPOINTS
              ═══════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            <h3 className="text-xl font-serif font-medium text-[#1a1c1c] flex items-center gap-3 pt-4">
              <BarChart3 className="w-5 h-5 text-[#775a19]" /> Model Insights
            </h3>

            <section id="feature-importance">
              <EndpointCard
                id="feature-importance-card"
                method="GET"
                path="/api/feature-importance"
                description="Retrieve permutation importance scores from the trained XGBoost model. Helps explain which environmental features most influence lion distribution."
                responseBody={`{
  "feature_importance": [
    { "feature": "longterm_slope_mean", "importance": 0.2341 },
    { "feature": "all_skew_mean", "importance": 0.1876 },
    { "feature": "dist_to_protected_km", "importance": 0.1523 },
    { "feature": "all_mean_mean", "importance": 0.1102 }
  ],
  "top_feature": "longterm_slope_mean",
  "top_importance": 0.2341
}`}
              />
            </section>

            <section id="model-metadata">
              <EndpointCard
                id="model-metadata-card"
                method="GET"
                path="/api/model/metadata"
                description="Get metadata about the trained XGBoost model including version, training date, feature list, and performance metrics."
                responseBody={`{
  "model_type": "XGBoost",
  "version": "2.0.0",
  "training_date": "2026-01-15",
  "feature_count": 43,
  "features": [
    "longterm_slope_mean",
    "all_skew_mean",
    "dist_to_protected_km",
    "all_mean_mean",
    "all_kurtosis_mean",
    "licorr_slope_mean",
    "pop2018_mean",
    "ann_amp_mean",
    "ann_cv_mean",
    "ann_peak_month_mean"
  ],
  "objective": "reg:squarederror",
  "performance_metrics": {
    "train_mse": 12.45,
    "train_mae": 2.87,
    "r_squared": 0.89
  }
}`}
              />
            </section>

            <section id="explain">
              <EndpointCard
                id="explain-card"
                method="POST"
                path="/api/explain"
                description="Generate a natural language explanation for a prediction given raw environmental features. Uses NVIDIA NeMo for interpretable AI reasoning."
                requestBody={`{
  "features": {
    "longterm_slope_mean": 0.03,
    "all_skew_mean": -0.12,
    "dist_to_protected_km": 5.4,
    "all_mean_mean": 0.8,
    "all_kurtosis_mean": 2.1,
    "pop2018_mean": 15.3
  }
}`}
                responseBody={`{
  "prediction": 8.42,
  "explanation": "This area shows moderate lion suitability (8.42 lions/km²). The low nightlight trend (0.03) and proximity to protected areas (5.4km) are favorable indicators...",
  "features": {
    "longterm_slope_mean": 0.03,
    "all_skew_mean": -0.12,
    "dist_to_protected_km": 5.4
  }
}`}
              />
            </section>

            <section id="explain-cell">
              <EndpointCard
                id="explain-cell-card"
                method="GET"
                path="/api/explain/cell/{cell_id}"
                description="Explain the prediction for a specific grid cell by its database ID. Automatically fetches cell features and generates an AI explanation."
                params={[
                  { name: 'cell_id', type: 'integer', required: true, desc: 'The unique grid cell identifier' },
                ]}
                responseBody={`{
  "cell_id": 1024,
  "prediction": 12.7,
  "explanation": "Cell 1024 within Olare-Motorogi shows high lion habitat suitability...",
  "features": {
    "longterm_slope_mean": 0.01,
    "dist_to_protected_km": 2.1,
    "all_mean_mean": 0.034
  },
  "management_unit": "Olare-Motorogi",
  "location": {
    "longitude": 35.12,
    "latitude": -1.45
  }
}`}
              />
            </section>
          </div>

          <hr className="border-[#d1c5b4]/60" />

          {/* ═══════════════════════════════════════════════════════
              DATA EXPORT & API KEYS
              ═══════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            <h3 className="text-xl font-serif font-medium text-[#1a1c1c] flex items-center gap-3 pt-4">
              <Download className="w-5 h-5 text-[#775a19]" /> Data Export
            </h3>

            <section id="grid-export">
              <EndpointCard
                id="grid-export-card"
                method="GET"
                path="/api/grid-cells/export"
                description="Export the full land-cover grid in GeoJSON, JSON, or CSV format. Ideal for offline analysis with Kepler.gl, QGIS, or Python notebooks."
                params={[
                  { name: 'format', type: 'string', required: false, desc: '"geojson" (default), "json", or "csv"' },
                  { name: 'management_unit', type: 'string', required: false, desc: 'Filter by management unit' },
                ]}
                responseBody={`// GeoJSON format
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [35.12, -1.45] },
      "properties": {
        "cell_id": 1024,
        "management_unit": "Olare-Motorogi",
        "lion_density": 12.7,
        "nightlight_intensity": 0.034,
        "nightlight_trend": 0.012,
        "distance_to_protected_km": 2.1,
        "pop_density": 15.3
      }
    }
  ]
}`}
              />
            </section>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-serif font-medium text-[#1a1c1c] flex items-center gap-3 pt-4">
              <Key className="w-5 h-5 text-[#775a19]" /> API Keys
            </h3>
            <p className="text-sm text-[#4e4639] leading-relaxed font-light max-w-2xl">
              API keys provide programmatic access to the Seka Kama platform. Keys are prefixed with
              <code className="bg-[#f5f0e8] px-1.5 py-0.5 rounded text-[12px] font-mono">sk-seka-</code> and
              should be treated as secrets. Manage keys from the <a href="/dashboard/api-keys" className="text-[#775a19] underline underline-offset-2 hover:text-[#4e3700] font-medium">API Management Dashboard</a>.
            </p>

            <section id="keys-list">
              <EndpointCard
                id="keys-list-card"
                method="GET"
                path="/api/keys"
                description="List all active API keys for the authenticated user. Key values are masked; only the prefix is returned."
                auth
                responseBody={`[
  {
    "id": 7,
    "name": "Wildlife Monitoring Bot",
    "prefix": "sk-seka-abc1****",
    "created_at": "2026-05-20T08:30:00",
    "last_used": "2026-05-24T14:22:00",
    "is_active": true
  }
]`}
              />
            </section>

            <section id="keys-create">
              <EndpointCard
                id="keys-create-card"
                method="POST"
                path="/api/keys"
                description="Generate a new API key. The full key value is returned ONLY in this response — store it securely. Subsequent requests will only show the masked prefix."
                auth
                requestBody={`{
  "name": "Field Data Pipeline"
}`}
                responseBody={`{
  "id": 8,
  "name": "Field Data Pipeline",
  "prefix": "sk-seka-xyz9****",
  "key": "sk-seka-xyz9a7bQ3kF2mNpR8sT1vW4xY6zA...",
  "created_at": "2026-05-24T16:00:00",
  "last_used": null,
  "is_active": true
}`}
              />
            </section>

            <section id="keys-revoke">
              <EndpointCard
                id="keys-revoke-card"
                method="DELETE"
                path="/api/keys/{key_id}"
                description="Permanently revoke an API key. This action cannot be undone. The key will immediately stop working for all requests."
                auth
                params={[
                  { name: 'key_id', type: 'integer', required: true, desc: 'The unique API key identifier' },
                ]}
                responseBody={`{
  "message": "API key revoked successfully"
}`}
              />
            </section>
          </div>

          <hr className="border-[#d1c5b4]/60" />

          {/* ── Architecture Deep Dive ────────────────────────────── */}
          <section className="space-y-10 pt-4">
            <h3 className="text-xl font-serif font-medium text-[#1a1c1c] flex items-center gap-3">
              <Book className="w-5 h-5 text-[#775a19]" /> Architecture
            </h3>

            <div className="p-10 bg-white enterprise-card border-[#d1c5b4]/40">
              <h4 className="text-lg font-serif font-medium text-[#1a1c1c] mb-4">The SekaNet Core Model</h4>
              <p className="text-sm text-[#4e4639] leading-relaxed mb-6 font-light">
                SekaNet is a gradient-boosted tree (XGBoost) architecture trained on a decade of
                spatiotemporal data across the Greater Mara Ecosystem. It predicts lion abundance
                per 1km² grid cell using a 43-feature matrix spanning habitat suitability,
                VIIRS nightlight intensity, human population density, and distance to protected area boundaries.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Resolution', value: '30 arcsecond (~1km²)' },
                  { label: 'Features', value: '43 environmental variables' },
                  { label: 'R² Score', value: '0.89' },
                  { label: 'NDVI Updates', value: 'Monthly (Sentinel-2)' },
                  { label: 'Nightlight Data', value: 'Annual VIIRS/NOAA' },
                  { label: 'LLM Engine', value: 'NVIDIA NeMo' },
                ].map(item => (
                  <div key={item.label} className="p-4 bg-[#f5f0e8]/50 rounded-lg border border-[#d1c5b4]/30">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#775a19] mb-1">{item.label}</div>
                    <div className="text-sm font-semibold text-[#1a1c1c]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-white enterprise-card border-[#d1c5b4]/40">
                <h4 className="text-lg font-serif font-medium text-[#1a1c1c] mb-3">Key Feature Families</h4>
                <ul className="space-y-2.5 text-sm text-[#4e4639] font-light">
                  <li className="flex items-start gap-2"><span className="text-[#775a19] mt-1">•</span> <span><strong className="font-medium">VIIRS Nightlights</strong> — long-term slope, mean, kurtosis, skewness across all composites</span></li>
                  <li className="flex items-start gap-2"><span className="text-[#775a19] mt-1">•</span> <span><strong className="font-medium">NDVI Vegetation</strong> — annual amplitude, coefficient of variation, peak month</span></li>
                  <li className="flex items-start gap-2"><span className="text-[#775a19] mt-1">•</span> <span><strong className="font-medium">Protected Areas</strong> — distance to WDPA boundaries, PA definition (1=WDPA, 0=OECM)</span></li>
                  <li className="flex items-start gap-2"><span className="text-[#775a19] mt-1">•</span> <span><strong className="font-medium">Human Footprint</strong> — population density (2018), light intensity correlations</span></li>
                </ul>
              </div>
              <div className="p-8 bg-white enterprise-card border-[#d1c5b4]/40">
                <h4 className="text-lg font-serif font-medium text-[#1a1c1c] mb-3">Technology Stack</h4>
                <ul className="space-y-2.5 text-sm text-[#4e4639] font-light">
                  <li className="flex items-start gap-2"><span className="text-[#775a19] mt-1">•</span> <span><strong className="font-medium">Backend</strong> — FastAPI (Python 3.11), Railway</span></li>
                  <li className="flex items-start gap-2"><span className="text-[#775a19] mt-1">•</span> <span><strong className="font-medium">Frontend</strong> — Next.js 16, Vercel</span></li>
                  <li className="flex items-start gap-2"><span className="text-[#775a19] mt-1">•</span> <span><strong className="font-medium">Database</strong> — Supabase (PostGIS)</span></li>
                  <li className="flex items-start gap-2"><span className="text-[#775a19] mt-1">•</span> <span><strong className="font-medium">ML Engine</strong> — XGBoost, StandardScaler</span></li>
                  <li className="flex items-start gap-2"><span className="text-[#775a19] mt-1">•</span> <span><strong className="font-medium">LLM</strong> — NVIDIA NeMo for narrative generation</span></li>
                  <li className="flex items-start gap-2"><span className="text-[#775a19] mt-1">•</span> <span><strong className="font-medium">Maps</strong> — Leaflet, Kepler.gl, deck.gl</span></li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── Quick Start cURL examples ─────────────────────────── */}
          <section className="space-y-6 pt-4">
            <h3 className="text-xl font-serif font-medium text-[#1a1c1c] flex items-center gap-3">
              <Terminal className="w-5 h-5 text-[#775a19]" /> Quick Start
            </h3>
            <p className="text-sm text-[#4e4639] leading-relaxed font-light max-w-2xl">
              Get started in 3 steps: register, authenticate, and run your first scenario.
            </p>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[#1a1c1c]">1. Register an account</h4>
              <CodeBlock language="bash">{`curl -X POST https://sekakama-production-0aa3.up.railway.app/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "you@example.com",
    "password": "securepassword",
    "full_name": "Your Name",
    "organization": "Your Org"
  }'`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[#1a1c1c]">2. Get your access token</h4>
              <CodeBlock language="bash">{`curl -X POST https://sekakama-production-0aa3.up.railway.app/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@example.com", "password": "securepassword"}'

# Response: { "access_token": "eyJ...", "token_type": "bearer" }`}</CodeBlock>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[#1a1c1c]">3. Run a scenario simulation</h4>
              <CodeBlock language="bash">{`curl -X POST https://sekakama-production-0aa3.up.railway.app/api/scenario \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[35.1,-1.5],[35.3,-1.5],[35.3,-1.3],[35.1,-1.3],[35.1,-1.5]]]
    },
    "feature_modifications": {"longterm_slope_mean": 0.15},
    "user_query": "Impact of increased nightlight?"
  }'`}</CodeBlock>
            </div>
          </section>

        </main>
      </div>

      <Footer />
    </div>
  );
}
