// web-app/seka_kama/components/ScenarioPanel.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/services/api';

interface Scenario {
  scenario_id: number;
  created_at: string;
  user_description?: string;
  modified_features?: Record<string, number>;
  predicted_lion_delta?: number;
  affected_cells?: number;
  llm_narrative?: string;
  delta_lions?: number;
  delta_percent?: number;
  predicted_total_lions?: number;
  baseline_total_lions?: number;
  affected_units?: Record<string, number>;
  request_data?: {
    geometry?: any;
    feature_modifications?: Record<string, number>;
    management_units?: string[];
    user_query?: string;
  };
}

interface ScenarioPanelProps {
  /** Called when user clicks "Load & Re-run". Receives the re-run API result. */
  onScenarioSelect: (result: any) => void;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const CalendarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const GridIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const TagIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
    <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
}

function getDelta(s: Scenario): number | null {
  return s.predicted_lion_delta ?? s.delta_lions ?? null;
}

function getNarrative(s: Scenario): string {
  return s.llm_narrative || s.request_data?.user_query || '';
}

function getDescription(s: Scenario): string {
  return s.user_description || s.request_data?.user_query || `Scenario #${s.scenario_id}`;
}

function getFeatureKeys(s: Scenario): string[] {
  const src = s.modified_features ?? s.request_data?.feature_modifications ?? {};
  return Object.keys(src).slice(0, 3);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScenarioPanel({ onScenarioSelect }: ScenarioPanelProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  /** Tracks which scenario is currently being re-run */
  const [rerunningId, setRerunningId] = useState<number | null>(null);
  const [rerunError, setRerunError] = useState<{ id: number; msg: string } | null>(null);

  const loadScenarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getScenarioHistory(50);
      // Backend returns { scenarios: [...], count: n }
      const list = Array.isArray(data) ? data : (data as any).scenarios ?? [];
      setScenarios(list);
    } catch (err: any) {
      const msg = err?.message?.includes('404')
        ? 'No scenario history found. Run your first simulation on the Spatial Analysis tab.'
        : `Could not load history: ${err?.message ?? 'Unknown error'}`;
      setError(msg);
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadScenarios(); }, [loadScenarios]);

  /**
   * Re-run a past scenario by extracting its original geometry and
   * feature modifications from request_data and calling the API again.
   * Falls back to showing the stored result if the geometry is missing.
   */
  const handleRerun = useCallback(async (scenario: Scenario) => {
    const geometry = scenario.request_data?.geometry;
    const featureMods =
      scenario.request_data?.feature_modifications ??
      scenario.modified_features ??
      {};

    // If no geometry was stored, fall back to showing the cached result
    if (!geometry) {
      onScenarioSelect(scenario);
      return;
    }

    setRerunningId(scenario.scenario_id);
    setRerunError(null);

    try {
      const result = await api.runScenario({
        geometry,
        feature_modifications: featureMods,
        management_units: scenario.request_data?.management_units,
        user_query: scenario.request_data?.user_query,
      });
      onScenarioSelect(result);
    } catch (err: any) {
      setRerunError({
        id: scenario.scenario_id,
        msg: err?.message ?? 'Re-run failed',
      });
    } finally {
      setRerunningId(null);
    }
  }, [onScenarioSelect]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0b0f1a', gap: '14px' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <SpinnerIcon />
        <p style={{ fontSize: '12px', color: '#475569', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Loading Scenario History
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '28px 32px', background: '#0b0f1a', minHeight: '100%' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .scenario-card:hover { border-color: rgba(16,185,129,0.2) !important; background: rgba(20,24,36,0.9) !important; }
        .load-btn:hover { background: rgba(16,185,129,0.2) !important; color: #10b981 !important; }
        .load-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .expand-link:hover { color: #10b981 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.4px' }}>
            Scenario History
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#475569' }}>
            Review and re-run past ecosystem simulations
          </p>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Digital Twin Active
            </span>
          </div>
        </div>
        <button
          onClick={loadScenarios}
          title="Refresh"
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            color: '#475569',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <RefreshIcon /> Refresh
        </button>
      </div>

      {/* Error / info banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', marginBottom: '20px',
          background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: '10px',
        }}>
          <AlertIcon />
          <span style={{ fontSize: '12.5px', color: '#fbbf24' }}>{error}</span>
        </div>
      )}

      {/* Stats row */}
      {scenarios.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Scenarios', value: scenarios.length, color: '#10b981' },
            { label: 'Negative Impact', value: scenarios.filter(s => (getDelta(s) ?? 0) < 0).length, color: '#f87171' },
            { label: 'Positive Impact', value: scenarios.filter(s => (getDelta(s) ?? 0) > 0).length, color: '#34d399' },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: '14px 16px',
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
            }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 500, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scenario cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {scenarios.map((scenario) => {
          const delta = getDelta(scenario);
          const isNegative = delta != null && delta < 0;
          const isExpanded = expandedId === scenario.scenario_id;
          const narrative = getNarrative(scenario);
          const features = getFeatureKeys(scenario);
          const cells = scenario.affected_cells;
          const isRerunning = rerunningId === scenario.scenario_id;
          const thisRerunError = rerunError?.id === scenario.scenario_id ? rerunError.msg : null;
          const hasGeometry = !!scenario.request_data?.geometry;

          return (
            <div
              key={scenario.scenario_id}
              className="scenario-card"
              style={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '18px 20px',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
                    #{scenario.scenario_id.toString().padStart(3, '0')}
                  </span>
                  <h3 style={{
                    margin: '4px 0 0',
                    fontSize: '14px', fontWeight: 600, color: '#e2e8f0',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {getDescription(scenario)}
                  </h3>
                </div>

                {delta != null && (
                  <div style={{
                    flexShrink: 0,
                    padding: '5px 12px',
                    borderRadius: '20px',
                    background: isNegative ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
                    border: `1px solid ${isNegative ? 'rgba(248,113,113,0.25)' : 'rgba(52,211,153,0.25)'}`,
                    fontSize: '13px', fontWeight: 700,
                    color: isNegative ? '#f87171' : '#34d399',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {delta >= 0 ? '+' : ''}{delta.toFixed(1)} lions
                  </div>
                )}
              </div>

              {/* Metadata row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#475569' }}>
                  <CalendarIcon /> {formatDate(scenario.created_at)}
                </span>
                {cells != null && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#475569' }}>
                    <GridIcon /> {cells.toLocaleString()} cells
                  </span>
                )}
                {features.length > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#475569' }}>
                    <TagIcon /> {features.join(', ')}
                  </span>
                )}
              </div>

              {/* Narrative */}
              {narrative && (
                <div style={{
                  marginTop: '14px',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: '12.5px', lineHeight: 1.6, color: '#64748b',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: isExpanded ? 99 : 2,
                  } as React.CSSProperties}>
                    {narrative}
                  </p>
                  {narrative.length > 120 && (
                    <button
                      className="expand-link"
                      onClick={() => setExpandedId(isExpanded ? null : scenario.scenario_id)}
                      style={{
                        display: 'inline-block', marginTop: '6px',
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        fontSize: '11.5px', fontWeight: 600, color: '#475569',
                        transition: 'color 0.15s', fontFamily: 'inherit',
                      }}
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}

              {/* Re-run error */}
              {thisRerunError && (
                <div style={{
                  marginTop: '10px', padding: '8px 12px',
                  background: 'rgba(248,113,113,0.07)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: '8px',
                  fontSize: '11.5px', color: '#f87171',
                }}>
                  Re-run failed: {thisRerunError}
                </div>
              )}

              {/* Actions */}
              <div style={{ marginTop: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="load-btn"
                  onClick={() => handleRerun(scenario)}
                  disabled={isRerunning}
                  title={hasGeometry ? 'Re-run this simulation with the original geometry' : 'Show stored result (geometry not saved)'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px',
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '8px',
                    color: '#6ee7b7',
                    fontSize: '12px', fontWeight: 600, cursor: isRerunning ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit',
                    opacity: isRerunning ? 0.6 : 1,
                  }}
                >
                  {isRerunning ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Running…
                    </>
                  ) : (
                    <>
                      {hasGeometry ? <PlayIcon /> : <PlayIcon />}
                      {hasGeometry ? 'Re-run Simulation' : 'Load Result'}
                    </>
                  )}
                </button>

                {!hasGeometry && (
                  <span style={{ fontSize: '10px', color: '#334155', fontStyle: 'italic' }}>
                    Geometry not stored — shows cached result
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {scenarios.length === 0 && !error && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '80px 40px', textAlign: 'center',
        }}>
          <div style={{
            width: '48px', height: '48px', marginBottom: '16px',
            background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <HistoryIcon />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#334155' }}>No scenarios yet</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#1e293b' }}>
            Switch to the Spatial Analysis tab, draw a polygon on the map and run your first simulation.
          </p>
        </div>
      )}
    </div>
  );
}

function HistoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
