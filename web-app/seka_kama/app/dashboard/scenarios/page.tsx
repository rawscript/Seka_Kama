'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api, Scenario } from '@/lib/api';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DeltaBadge({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        background: positive ? '#e8f5e9' : '#ffebee',
        color: positive ? '#2e7d32' : '#c62828',
      }}
    >
      {positive ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} lions
    </span>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getScenarioHistory(100);
      setScenarios(Array.isArray(data) ? data : (data as any).scenarios ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load scenarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: number) => setExpanded(prev => (prev === id ? null : id));

  return (
    <ProtectedRoute>
      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Scenario History</h1>
            <p style={styles.subtitle}>
              What-if simulations run against the SekaNet XGBoost model
            </p>
          </div>
          <button style={styles.refreshBtn} onClick={load} disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>

        {/* Error */}
        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Empty state */}
        {!loading && !error && scenarios.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🦁</div>
            <p style={styles.emptyText}>No scenarios yet.</p>
            <p style={styles.emptyHint}>
              Run a what-if simulation from the Spatial Analysis view to see results here.
            </p>
          </div>
        )}

        {/* List */}
        {!loading && scenarios.length > 0 && (
          <div style={styles.list}>
            {scenarios.map((s) => {
              const isOpen = expanded === s.scenario_id;
              return (
                <div key={s.scenario_id} style={styles.card}>
                  {/* Card header */}
                  <button
                    style={styles.cardHeader}
                    onClick={() => toggle(s.scenario_id)}
                    aria-expanded={isOpen}
                  >
                    <div style={styles.cardMeta}>
                      <span style={styles.scenarioId}>#{s.scenario_id}</span>
                      <span style={styles.scenarioDate}>{formatDate(s.created_at)}</span>
                    </div>
                    <div style={styles.cardRight}>
                      <DeltaBadge delta={s.delta_lions} />
                      <span style={{ fontSize: '1rem', color: '#888', marginLeft: '0.5rem' }}>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div style={styles.cardBody}>
                      <div style={styles.statsRow}>
                        <Stat label="Baseline" value={`${s.baseline_total_lions.toFixed(1)} lions`} />
                        <Stat label="Predicted" value={`${s.predicted_total_lions.toFixed(1)} lions`} />
                        <Stat label="Delta %" value={`${s.delta_percent >= 0 ? '+' : ''}${s.delta_percent.toFixed(1)}%`} />
                      </div>

                      {s.llm_narrative && (
                        <div style={styles.narrative}>
                          <p style={styles.narrativeLabel}>AI Narrative</p>
                          <p style={styles.narrativeText}>{s.llm_narrative}</p>
                        </div>
                      )}

                      {s.request_data?.feature_modifications && (
                        <div>
                          <p style={styles.narrativeLabel}>Modified Features</p>
                          <div style={styles.featureGrid}>
                            {Object.entries(s.request_data.feature_modifications).map(([k, v]) => (
                              <div key={k} style={styles.featureChip}>
                                <span style={styles.featureKey}>{k}</span>
                                <span style={styles.featureVal}>{(v as number) >= 0 ? '+' : ''}{(v as number).toFixed(3)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={styles.list}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ ...styles.card, height: 64, background: '#f0f0f0', animation: 'pulse 1.5s ease infinite' }} />
            ))}
          </div>
        )}

        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statBox}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' },
  title: { margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1a1a2e' },
  subtitle: { margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#666' },
  refreshBtn: { padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#333' },
  errorBanner: { background: '#ffebee', color: '#c62828', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem' },
  emptyState: { textAlign: 'center', padding: '4rem 1rem' },
  emptyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  emptyText: { fontSize: '1.1rem', fontWeight: 600, color: '#333', margin: 0 },
  emptyHint: { fontSize: '0.875rem', color: '#888', marginTop: '0.5rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card: { border: '1px solid #e0e0e0', borderRadius: 12, overflow: 'hidden', background: '#fff' },
  cardHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  scenarioId: { fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e' },
  scenarioDate: { fontSize: '0.8rem', color: '#888' },
  cardRight: { display: 'flex', alignItems: 'center' },
  cardBody: { padding: '0 1.25rem 1.25rem', borderTop: '1px solid #f0f0f0' },
  statsRow: { display: 'flex', gap: '1rem', padding: '1rem 0' },
  statBox: { flex: 1, background: '#f8f9fa', borderRadius: 8, padding: '0.75rem', textAlign: 'center' },
  statLabel: { display: 'block', fontSize: '0.7rem', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' },
  statValue: { display: 'block', fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e' },
  narrative: { background: '#f0f7f0', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' },
  narrativeLabel: { margin: '0 0 0.4rem', fontSize: '0.75rem', fontWeight: 600, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em' },
  narrativeText: { margin: 0, fontSize: '0.875rem', color: '#333', lineHeight: 1.6 },
  featureGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' },
  featureChip: { display: 'flex', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: 999, border: '1px solid #e0e0e0', background: '#fafafa', fontSize: '0.8rem' },
  featureKey: { color: '#555' },
  featureVal: { fontWeight: 600, color: '#1a1a2e' },
};
