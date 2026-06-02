'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api } from '@/services/api';
import { getApiUrl } from '@/services/config';
import {
  Key, Plus, Trash2, Copy, Eye, EyeOff,
  Shield, User, Bell, Database, Activity,
  CheckCircle, AlertTriangle, RefreshCw, ExternalLink
} from 'lucide-react';

interface ApiKey { id: number; name: string; prefix: string; created_at: string; }
interface UserProfile { id: string; email: string; full_name: string; role: string; }

// ── Sub-components ────────────────────────────────────────────────────────────

function SettingsSection({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#d1c5b4]/60 shadow-sm">
      <div className="px-8 py-5 border-b border-[#d1c5b4]/40 flex items-center gap-3">
        <Icon className="w-4 h-4 text-[#775a19]" />
        <h2 className="text-[11px] font-bold text-[#1a1c1c] uppercase tracking-[0.2em]">{title}</h2>
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${
      ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
    }`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [apiKeys, setApiKeys]         = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName]   = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [showNewKey, setShowNewKey]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [copied, setCopied]           = useState(false);
  const [toast, setToast]             = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch(`${getApiUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProfile(await res.json());
    } catch { /* non-fatal */ }
  }, []);

  const loadKeys = useCallback(async () => {
    try { setApiKeys(await api.listApiKeys()); } catch { /* non-fatal */ }
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/health`);
      const data = await res.json();
      setHealthStatus(data);
    } catch {
      setHealthStatus({ status: 'error', detail: 'Unreachable' });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadKeys();
    loadHealth();
  }, [loadProfile, loadKeys, loadHealth]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const { key } = await api.createApiKey(newKeyName.trim());
      setNewKeyValue(key);
      setShowNewKey(true);
      setNewKeyName('');
      await loadKeys();
      showToast('API key created successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to create key.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (id: number) => {
    if (!confirm('Permanently revoke this key? This cannot be undone.')) return;
    try {
      await api.revokeApiKey(id);
      await loadKeys();
      showToast('Key revoked.');
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke key.');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHealthy = healthStatus?.status === 'healthy' || healthStatus?.status === 'ok';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f9f9f9] font-sans">

        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-[9999] px-5 py-3 bg-[#1a1c1c] text-white text-[11px] font-bold tracking-wide shadow-2xl rounded-sm animate-in fade-in slide-in-from-top-2">
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="max-w-[1440px] mx-auto px-6 md:px-20 py-16">
          <div className="mb-12 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-[0.3em] mb-2">Account</p>
              <h1 className="text-4xl font-serif font-light text-[#1a1c1c] tracking-tight">Settings & API Access</h1>
            </div>
            <a
              href="/dashboard"
              className="text-[11px] font-bold uppercase tracking-[0.2em] px-6 py-3 border border-[#777667] text-[#1a1c1c] hover:bg-[#1a1c1c] hover:text-white transition-all"
            >
              ← Dashboard
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-8">

              {/* Profile */}
              {profile && (
                <SettingsSection title="Profile" icon={User}>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest mb-1">Full Name</p>
                      <p className="text-lg font-serif text-[#1a1c1c]">{profile.full_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest mb-1">Email</p>
                      <p className="text-lg font-serif text-[#1a1c1c]">{profile.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest mb-1">Role</p>
                      <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-[#775a19]/10 text-[#775a19] border border-[#775a19]/20">
                        {profile.role}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest mb-1">User ID</p>
                      <p className="text-sm font-mono text-[#4e4639] truncate">{profile.id}</p>
                    </div>
                  </div>
                </SettingsSection>
              )}

              {/* API Keys */}
              <SettingsSection title="API Keys" icon={Key}>
                {newKeyValue && (
                  <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-sm space-y-3">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5" /> Key Created — copy it now, it won't be shown again
                    </p>
                    <div className="flex items-center gap-3">
                      <code className={`flex-1 font-mono text-xs bg-white border border-emerald-200 px-3 py-2 text-emerald-900 overflow-hidden text-ellipsis ${showNewKey ? '' : 'filter blur-sm select-none'}`}>
                        {newKeyValue}
                      </code>
                      <button onClick={() => setShowNewKey(v => !v)} className="text-emerald-600 hover:text-emerald-800">
                        {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleCopy(newKeyValue)} className="text-emerald-600 hover:text-emerald-800">
                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <button onClick={() => setNewKeyValue(null)} className="text-[10px] text-emerald-600 underline">
                      I've saved it — dismiss
                    </button>
                  </div>
                )}

                {/* Create form */}
                <form onSubmit={handleCreateKey} className="flex gap-4 mb-8">
                  <input
                    type="text"
                    placeholder="Key name (e.g. my-script)"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    className="flex-1 border border-[#d1c5b4] bg-white px-4 py-2 text-sm text-[#1a1c1c] focus:outline-none focus:border-[#775a19] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loading || !newKeyName.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-[#775a19] text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-[#5c4313] transition-colors"
                  >
                    {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Create
                  </button>
                </form>

                {/* Existing keys */}
                {apiKeys.length === 0 ? (
                  <p className="text-sm text-[#7f7667] italic">No API keys yet. Create one above to access the SekaNet REST API programmatically.</p>
                ) : (
                  <div className="divide-y divide-[#d1c5b4]/40">
                    {apiKeys.map(k => (
                      <div key={k.id} className="py-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-[#1a1c1c]">{k.name}</p>
                          <p className="text-[10px] font-mono text-[#7f7667]">{k.prefix}••••••••••••</p>
                          <p className="text-[9px] text-[#a09889] mt-0.5">Created {new Date(k.created_at).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wide border border-red-200 hover:border-red-400 px-3 py-1.5 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SettingsSection>

              {/* Data Standards */}
              <SettingsSection title="Data Standards & Provenance" icon={Database}>
                <div className="space-y-4 text-sm text-[#4e4639] font-light leading-relaxed">
                  <p>All simulation outputs produced by Seka Kama are grounded in open, peer-reviewed data sources and carry explicit provenance metadata upon export.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    {[
                      { src: 'NASA POWER', desc: 'Annual precipitation (PRECTOTCORR)', url: 'https://power.larc.nasa.gov/' },
                      { src: 'GBIF',       desc: 'Herbivore occurrence density',        url: 'https://www.gbif.org/' },
                      { src: 'GHSL',       desc: 'Human settlement / pop. density',     url: 'https://ghsl.jrc.ec.europa.eu/' },
                    ].map(d => (
                      <a key={d.src} href={d.url} target="_blank" rel="noopener noreferrer"
                        className="p-4 border border-[#d1c5b4]/60 hover:border-[#775a19]/40 transition-colors group">
                        <p className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest mb-1 flex items-center gap-1">
                          {d.src} <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <p className="text-[11px] text-[#4e4639]">{d.desc}</p>
                      </a>
                    ))}
                  </div>
                </div>
              </SettingsSection>
            </div>

            {/* Right column */}
            <div className="space-y-8">

              {/* System Health */}
              <SettingsSection title="System Health" icon={Activity}>
                {healthLoading ? (
                  <div className="flex items-center gap-3 py-4">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#775a19]" />
                    <span className="text-sm text-[#7f7667]">Checking…</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <StatusBadge ok={isHealthy} label={isHealthy ? 'Operational' : 'Degraded'} />
                    {healthStatus && (
                      <div className="space-y-2 font-mono text-[10px] text-[#4e4639] pt-2">
                        {Object.entries(healthStatus).filter(([k]) => k !== 'status').map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-4">
                            <span className="text-[#7f7667] capitalize">{k.replace(/_/g, ' ')}</span>
                            <span className="font-bold text-[#1a1c1c] truncate text-right max-w-[120px]">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={loadHealth}
                      className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest mt-2 flex items-center gap-1.5 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>
                )}
              </SettingsSection>

              {/* Security */}
              <SettingsSection title="Security" icon={Shield}>
                <div className="space-y-4 text-[11px] text-[#4e4639]">
                  {[
                    { label: 'JWT Auth',        ok: true,  desc: 'HS256 tokens, 30-min expiry' },
                    { label: 'HTTPS',           ok: true,  desc: 'TLS 1.3 enforced' },
                    { label: 'RBAC',            ok: true,  desc: 'admin / researcher / viewer' },
                    { label: 'Rate Limiting',   ok: true,  desc: '60 req/min per key' },
                    { label: 'Audit Logs',      ok: true,  desc: 'All writes logged' },
                  ].map(row => (
                    <div key={row.label} className="flex items-start gap-3">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-[#1a1c1c]">{row.label}</p>
                        <p className="text-[#7f7667]">{row.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingsSection>

              {/* Notifications placeholder */}
              <SettingsSection title="Notifications" icon={Bell}>
                <p className="text-sm text-[#7f7667] italic">Email notification preferences coming in v2.2.0.</p>
              </SettingsSection>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
