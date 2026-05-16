'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api } from '@lib/api';

// ── types ─────────────────────────────────────────────────────────────────────

interface Stats {
  total_lions: number;
  total_area_km2: number;
  avg_lion_density: number;
  protected_area_coverage_km2: number;
  avg_nightlight_trend: number;
  high_risk_cell_count: number;
  management_unit_count: number;
}

interface FeatureImportance {
  feature: string;
  importance: number;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function fetchStats(unit?: string): Promise<Stats> {
  const url = unit ? `${API_URL}/statistics?management_unit=${unit}` : `${API_URL}/statistics`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to fetch statistics');
  return r.json();
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [importance, setImportance] = useState<FeatureImportance[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load feature importance once
  useEffect(() => {
    api.getFeatureImportance()
      .then(d => setImportance(d.feature_importance.slice(0, 12)))
      .catch(() => {});
  }, []);

  // Load stats whenever selectedUnit changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchStats(selectedUnit || undefined)
      .then(d => setStats(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedUnit]);

  const maxImportance = importance[0]?.importance ?? 1;

  return (
    <ProtectedRoute>
      <div style={s.page}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Landscape Report</h1>
            <p style={s.subtitle}>Aggregated statistics &amp; model insights for the Seka Kama ecosystem</p>
          </div>
          <select
            style={s.unitSelect}
            value={selectedUnit}
            onChange={e => setSelectedUnit(e.target.value)}
          >
            <option value="">All Management Units</option>
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {error && <div style={s.errorBanner}>{error}</div>}

        {/* Stat cards */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Population Overview</h2>
          <div style={s.cardGrid}>
            <StatCard icon="🦁" label="Total Lions" value={stats?.total_lions.toFixed(0) ?? '—'} loading={loading} />
            <StatCard icon="📐" label="Area (km²)" value={stats?.total_area_km2.toLocaleString() ?? '—'} loading={loading} />
            <StatCard icon="📊" label="Avg Density" value={stats ? `${stats.avg_lion_density.toFixed(3)}/km²` : '—'} loading={loading} />
            <StatCard icon="🏞️" label="Protected Area" value={stats ? `${stats.protected_area_coverage_km2.toFixed(0)} km²` : '—'} loading={loading} />
            <StatCard icon="💡" label="Nightlight Trend" value={stats ? `${stats.avg_nightlight_trend >= 0 ? '+' : ''}${stats.avg_nightlight_trend.toFixed(4)}` : '—'} loading={loading} accent={stats && stats.avg_nightlight_trend > 0 ? '#ffebee' : '#e8f5e9'} />
            <StatCard icon="⚠️" label="High-Risk Cells" value={stats?.high_risk_cell_count.toLocaleString() ?? '—'} loading={loading} accent="#fff8e1" />
          </div>
        </section>

        {/* Feature importance */}
        {importance.length > 0 && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>SekaNet Model — Top Predictors</h2>
            <p style={s.sectionHint}>Permutation importance from the XGBoost ensemble (higher = more influential)</p>
            <div style={s.importanceList}>
              {importance.map((f, i) => {
                const pct = (f.importance / maxImportance) * 100;
                return (
                  <div key={f.feature} style={s.importanceRow}>
                    <span style={s.importanceRank}>{i + 1}</span>
                    <span style={s.importanceName}>{f.feature}</span>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFill, width: `${pct}%` }} />
                    </div>
                    <span style={s.importanceVal}>{f.importance.toFixed(4)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Export note */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Data Export</h2>
          <p style={s.sectionHint}>Download the grid cell dataset in your preferred format.</p>
          <div style={s.exportRow}>
            {(['geojson', 'json', 'csv'] as const).map(fmt => (
              <a
                key={fmt}
                href={`${API_URL}/grid-cells/export?format=${fmt}${selectedUnit ? `&management_unit=${selectedUnit}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                style={s.exportBtn}
              >
                ⬇ {fmt.toUpperCase()}
              </a>
            ))}
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, loading, accent
}: { icon: string; label: string; value: string; loading: boolean; accent?: string }) {
  return (
    <div style={{ ...s.statCard, background: accent ?? '#fff' }}>
      <span style={s.cardIcon}>{icon}</span>
      <div>
        <div style={s.cardLabel}>{label}</div>
        <div style={s.cardValue}>
          {loading ? <span style={s.skeleton} /> : value}
        </div>
      </div>
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' },
  title: { margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1a1a2e' },
  subtitle: { margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#666' },
  unitSelect: { padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: '0.875rem', color: '#333', cursor: 'pointer' },
  errorBanner: { background: '#ffebee', color: '#c62828', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem' },
  section: { marginBottom: '2.5rem' },
  sectionTitle: { margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' },
  sectionHint: { margin: '0 0 1rem', fontSize: '0.8rem', color: '#888' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' },
  statCard: { border: '1px solid #e0e0e0', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  cardIcon: { fontSize: '1.5rem' },
  cardLabel: { fontSize: '0.75rem', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' },
  cardValue: { fontSize: '1.35rem', fontWeight: 700, color: '#1a1a2e', marginTop: 2 },
  skeleton: { display: 'inline-block', width: 80, height: 22, background: '#e0e0e0', borderRadius: 6, animation: 'pulse 1.5s ease infinite' },
  importanceList: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  importanceRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  importanceRank: { width: 22, textAlign: 'right', fontSize: '0.75rem', color: '#aaa', fontVariantNumeric: 'tabular-nums' },
  importanceName: { width: 240, fontSize: '0.82rem', color: '#333', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  barTrack: { flex: 1, height: 10, background: '#f0f0f0', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, #4CAF50, #81C784)', borderRadius: 999, transition: 'width 0.4s ease' },
  importanceVal: { width: 60, textAlign: 'right', fontSize: '0.78rem', color: '#555', fontVariantNumeric: 'tabular-nums' },
  exportRow: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  exportBtn: { padding: '0.6rem 1.25rem', borderRadius: 8, border: '1px solid #4CAF50', color: '#4CAF50', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'background 0.2s', background: '#fff' },
};
