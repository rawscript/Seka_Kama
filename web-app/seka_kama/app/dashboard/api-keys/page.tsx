'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

// ── The API key feature is currently a UI skeleton. ──────────────────────────
// When the /api/keys backend endpoints are implemented, replace the mock
// functions below with real fetch calls.

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used: string | null;
  scopes: string[];
}

const MOCK_KEYS: ApiKey[] = [
  {
    id: 'key_001',
    name: 'Default Analyst Key',
    prefix: 'sk-seka-****',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    last_used: new Date(Date.now() - 3600000).toISOString(),
    scopes: ['baseline:read', 'scenario:run'],
  },
];

const SCOPE_LABELS: Record<string, string> = {
  'baseline:read':   'Read baseline data',
  'scenario:run':    'Run scenarios',
  'scenario:read':   'Read scenario history',
  'export:download': 'Download exports',
  'admin:*':         'Full admin access',
};

// ── helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null) {
  if (!iso) return 'Never';
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);

    // Placeholder — replace with real API call
    await new Promise(r => setTimeout(r, 600));
    const generated = `sk-seka-${Math.random().toString(36).slice(2, 18)}`;
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      prefix: `sk-seka-${generated.slice(8, 12)}****`,
      created_at: new Date().toISOString(),
      last_used: null,
      scopes: ['baseline:read', 'scenario:run'],
    };

    setKeys(prev => [newKey, ...prev]);
    setNewKeyValue(generated);
    setNewKeyName('');
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    setRevoking(id);
    await new Promise(r => setTimeout(r, 400));
    setKeys(prev => prev.filter(k => k.id !== id));
    setRevoking(null);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <ProtectedRoute>
      <div style={s.page}>
        <h1 style={s.title}>API Keys</h1>
        <p style={s.subtitle}>
          Use API keys to authenticate programmatic access to the Seka Kama API.
          Keys are shown once at creation — store them securely.
        </p>

        {/* New key reveal banner */}
        {newKeyValue && (
          <div style={s.keyReveal}>
            <span style={s.keyRevealLabel}>⚠️ Save this key — it won't be shown again:</span>
            <div style={s.keyRevealRow}>
              <code style={s.keyCode}>{newKeyValue}</code>
              <button
                style={s.copyBtn}
                onClick={() => copyToClipboard(newKeyValue, 'new')}
              >
                {copiedId === 'new' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <button style={s.dismissBtn} onClick={() => setNewKeyValue(null)}>Dismiss</button>
          </div>
        )}

        {/* Create form */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Create New Key</h2>
          <form onSubmit={handleCreate} style={s.createRow}>
            <input
              id="key-name"
              style={s.nameInput}
              placeholder="e.g. My Analysis Script"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              required
              maxLength={60}
            />
            <button type="submit" style={s.createBtn} disabled={creating || !newKeyName.trim()}>
              {creating ? 'Creating…' : '+ Create Key'}
            </button>
          </form>
          <p style={s.scopeNote}>New keys are granted <strong>baseline:read</strong> + <strong>scenario:run</strong> scopes by default.</p>
        </div>

        {/* Keys list */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Active Keys ({keys.length})</h2>
          {keys.length === 0 && (
            <p style={s.emptyNote}>No API keys. Create one above.</p>
          )}
          <div style={s.keyList}>
            {keys.map(k => (
              <div key={k.id} style={s.keyRow}>
                <div style={s.keyInfo}>
                  <div style={s.keyName}>{k.name}</div>
                  <div style={s.keyPrefix}>{k.prefix}</div>
                  <div style={s.keyMeta}>
                    Created {relativeTime(k.created_at)} &nbsp;·&nbsp; Last used: {relativeTime(k.last_used)}
                  </div>
                  <div style={s.scopeRow}>
                    {k.scopes.map(sc => (
                      <span key={sc} style={s.scopeTag} title={SCOPE_LABELS[sc] ?? sc}>{sc}</span>
                    ))}
                  </div>
                </div>
                <div style={s.keyActions}>
                  <button
                    style={s.revokeBtn}
                    onClick={() => handleRevoke(k.id)}
                    disabled={revoking === k.id}
                  >
                    {revoking === k.id ? 'Revoking…' : 'Revoke'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Docs link */}
        <p style={s.docsNote}>
          See the{' '}
          <a href="https://github.com/rawscript/Seka_Kama" target="_blank" rel="noopener noreferrer" style={s.docsLink}>
            API documentation
          </a>{' '}
          for usage examples.
        </p>
      </div>
    </ProtectedRoute>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'Inter, system-ui, sans-serif' },
  title: { margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700, color: '#1a1a2e' },
  subtitle: { margin: '0 0 1.5rem', fontSize: '0.875rem', color: '#666', lineHeight: 1.6 },
  keyReveal: { background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' },
  keyRevealLabel: { display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#e65100', marginBottom: '0.5rem' },
  keyRevealRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' },
  keyCode: { flex: 1, padding: '0.4rem 0.75rem', background: '#fff', borderRadius: 6, border: '1px solid #ffe082', fontSize: '0.875rem', fontFamily: 'monospace', wordBreak: 'break-all' },
  copyBtn: { padding: '0.4rem 0.9rem', borderRadius: 6, border: 'none', background: '#FB8C00', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  dismissBtn: { background: 'none', border: 'none', color: '#888', fontSize: '0.8rem', cursor: 'pointer', padding: 0 },
  card: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' },
  cardTitle: { margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' },
  createRow: { display: 'flex', gap: '0.75rem' },
  nameInput: { flex: 1, padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', color: '#333', outline: 'none' },
  createBtn: { padding: '0.6rem 1.25rem', borderRadius: 8, border: 'none', background: '#4CAF50', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  scopeNote: { margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#888' },
  emptyNote: { fontSize: '0.875rem', color: '#aaa', textAlign: 'center', padding: '1rem' },
  keyList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  keyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.875rem 1rem', background: '#f8f9fa', borderRadius: 8, border: '1px solid #eee' },
  keyInfo: { flex: 1 },
  keyName: { fontWeight: 600, fontSize: '0.9rem', color: '#1a1a2e', marginBottom: '0.2rem' },
  keyPrefix: { fontFamily: 'monospace', fontSize: '0.82rem', color: '#555', marginBottom: '0.25rem' },
  keyMeta: { fontSize: '0.75rem', color: '#aaa', marginBottom: '0.4rem' },
  scopeRow: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem' },
  scopeTag: { padding: '0.15rem 0.5rem', borderRadius: 999, background: '#e8f5e9', color: '#2e7d32', fontSize: '0.72rem', fontWeight: 500, fontFamily: 'monospace' },
  keyActions: { marginLeft: '1rem' },
  revokeBtn: { padding: '0.4rem 0.85rem', borderRadius: 6, border: '1px solid #ffcdd2', background: '#fff', color: '#e53935', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' },
  docsNote: { fontSize: '0.8rem', color: '#888', textAlign: 'center' },
  docsLink: { color: '#4CAF50', textDecoration: 'none', fontWeight: 500 },
};
