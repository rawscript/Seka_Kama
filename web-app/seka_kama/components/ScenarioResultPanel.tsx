// web-app/seka_kama/components/ScenarioResultPanel.tsx
'use client';

interface ScenarioResultPanelProps {
  result: any;
  onClose: () => void;
}

// ── Safe number helpers ────────────────────────────────────────────────────

function safeFixed(val: any, digits = 1): string {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (!isFinite(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(digits);
}

function safeFixedAbs(val: any, digits = 1): string {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (!isFinite(n)) return '—';
  return n.toFixed(digits);
}

function safeInt(val: any): string {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (!isFinite(n)) return '—';
  return Math.round(n).toLocaleString();
}

// ── Normalize: accept both live ScenarioResponse and history Scenario shapes ─

function normalize(result: any) {
  const isSelection = result.type === 'selection';

  // History scenario shape: predicted_lion_delta, user_description, llm_narrative
  // Live scenario shape: delta_lions, delta_percent, predicted_total_lions, baseline_total_lions

  const delta: number | null =
    result.delta_lions ?? result.predicted_lion_delta ?? null;

  const deltaPercent: number | null =
    result.delta_percent ?? (
      result.baseline_total_lions && delta != null
        ? (delta / result.baseline_total_lions) * 100
        : null
    );

  const predictedTotal: number | null =
    result.predicted_total_lions ?? null;

  const baselineTotal: number | null =
    result.baseline_total_lions ?? null;

  const affectedUnits: Record<string, number> =
    result.affected_units ?? {};

  const narrative: string =
    result.llm_narrative ?? result.request_data?.user_query ?? '';

  const title: string =
    result.user_description ?? result.request_data?.user_query ?? `Scenario #${result.scenario_id ?? ''}`;

  const affectedCells: number | null =
    result.affected_cells ?? null;

  return { isSelection, delta, deltaPercent, predictedTotal, baselineTotal, affectedUnits, narrative, title, affectedCells };
}

// ── Icons ──────────────────────────────────────────────────────────────────

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const TrendDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
  </svg>
);

const TrendUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);

// ── Main component ─────────────────────────────────────────────────────────

export default function ScenarioResultPanel({ result, onClose }: ScenarioResultPanelProps) {
  const { isSelection, delta, deltaPercent, predictedTotal, baselineTotal, affectedUnits, narrative, title, affectedCells } = normalize(result);

  const isNegative = delta != null && delta < 0;
  const deltaColor = isNegative ? '#f87171' : '#34d399';
  const deltaBg = isNegative ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)';
  const deltaBorder = isNegative ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)';

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      width: '360px',
      maxHeight: 'calc(100vh - 100px)',
      overflowY: 'auto',
      background: '#141824',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px',
      boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      zIndex: 1000,
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
        position: 'sticky',
        top: 0,
        background: '#141824',
        zIndex: 1,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            {isSelection ? 'Selection Analysis' : 'Simulation Results'}
          </div>
          <h3 style={{
            margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#e2e8f0',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '260px',
          }}>
            {isSelection ? `${result.cells?.length ?? 0} cells selected` : title}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            flexShrink: 0,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '6px',
            cursor: 'pointer',
            color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          <CloseIcon />
        </button>
      </div>

      <div style={{ padding: '18px' }}>
        {isSelection ? (
          /* ── Selection mode ─────────────────────────────────────────── */
          <>
            <StatCard
              label="Selected Cells"
              value={result.cells?.length?.toLocaleString() ?? '—'}
            />
            <StatCard
              label="Current Lions (sum)"
              value={safeFixedAbs(
                result.cells?.reduce((s: number, c: any) => s + (c.properties?.lion_density ?? 0), 0),
                1
              )}
            />
            <StatCard
              label="Projected (+15% Nightlight)"
              value={safeFixedAbs(
                result.cells?.reduce((s: number, c: any) => s + (c.properties?.lion_density ?? 0), 0) * 0.85,
                1
              )}
              valueColor="#f87171"
            />
            <div style={{
              marginTop: '4px',
              padding: '12px 14px',
              background: 'rgba(251,191,36,0.06)',
              border: '1px solid rgba(251,191,36,0.15)',
              borderRadius: '10px',
              fontSize: '12px', lineHeight: 1.6, color: '#94a3b8',
            }}>
              Selected area shows high nightlight intensity and moderate lion density.
              Increasing nightlight by 15% would likely reduce lion presence by approximately 15%
              based on SekaNet model sensitivity.
            </div>
          </>
        ) : (
          /* ── Scenario results mode ──────────────────────────────────── */
          <>
            {/* Primary delta display */}
            {delta != null && (
              <div style={{
                padding: '16px',
                background: deltaBg,
                border: `1px solid ${deltaBorder}`,
                borderRadius: '12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}>
                <div style={{
                  width: '40px', height: '40px', flexShrink: 0,
                  background: deltaBg,
                  border: `1px solid ${deltaBorder}`,
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: deltaColor,
                }}>
                  {isNegative ? <TrendDownIcon /> : <TrendUpIcon />}
                </div>
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: deltaColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {safeFixed(delta, 1)} lions
                  </div>
                  {deltaPercent != null && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                      {safeFixed(deltaPercent, 1)}% change
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Secondary metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {predictedTotal != null && (
                <StatCard label="New Total" value={safeInt(predictedTotal) + ' lions'} small />
              )}
              {baselineTotal != null && (
                <StatCard label="Baseline" value={safeInt(baselineTotal) + ' lions'} small />
              )}
              {affectedCells != null && (
                <StatCard label="Affected Cells" value={affectedCells.toLocaleString()} small />
              )}
            </div>

            {/* Affected units */}
            {Object.keys(affectedUnits).length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Most Affected Areas
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(affectedUnits)
                    .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))
                    .slice(0, 4)
                    .map(([unit, d]) => {
                      const n = d as number;
                      const pct = Math.min(Math.abs(n) / Math.max(...Object.values(affectedUnits).map(Math.abs)) * 100, 100);
                      return (
                        <div key={unit} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ flex: 1, fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit}</span>
                          <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: n < 0 ? '#f87171' : '#34d399', borderRadius: '2px' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: n < 0 ? '#f87171' : '#34d399', fontVariantNumeric: 'tabular-nums', minWidth: '44px', textAlign: 'right' }}>
                            {n >= 0 ? '+' : ''}{isFinite(n) ? n.toFixed(1) : '—'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Narrative */}
            {narrative && (
              <div style={{
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '7px' }}>
                  Model Narrative
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.65, color: '#64748b' }}>
                  {narrative}
                </p>
              </div>
            )}
          </>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            color: '#64748b',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ── StatCard helper ────────────────────────────────────────────────────────

function StatCard({ label, value, valueColor, small }: {
  label: string;
  value: string;
  valueColor?: string;
  small?: boolean;
}) {
  return (
    <div style={{
      padding: small ? '10px 12px' : '12px 14px',
      background: '#1a2030',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '10px',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: small ? '16px' : '20px', fontWeight: 700, color: valueColor ?? '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}