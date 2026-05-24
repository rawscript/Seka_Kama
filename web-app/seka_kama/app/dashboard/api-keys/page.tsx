'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api } from '@/services/api';
import { Key, Plus, Trash2, Copy, Check, AlertCircle, Loader2, BookOpen } from 'lucide-react';

interface ApiKey {
  id: number;
  name: string;
  prefix: string;
  created_at: string;
  last_used: string | null;
  is_active: boolean;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const data = await api.get('/keys/');
      setKeys(data);
    } catch (err) {
      setError('Failed to load API keys');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    
    try {
      setCreating(true);
      setError(null);
      const result = await api.post('/keys/', { name: newKeyName.trim() });
      
      setNewKeyValue(result.key);
      setKeys(prev => [result, ...prev]);
      setNewKeyName('');
    } catch (err) {
      setError('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;
    
    try {
      setRevoking(id);
      await api.delete(`/keys/${id}/`);
      setKeys(prev => prev.filter(k => k.id !== id));
    } catch (err) {
      setError('Failed to revoke API key');
    } finally {
      setRevoking(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto p-8 space-y-8 animate-in fade-in duration-700">
        <header className="space-y-2">
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Key className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em]">Developer Portal</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">API Management</h1>
          <p className="text-gray-400 max-w-2xl leading-relaxed">
            Programmatic access tokens for the Seka Kama Digital Twin.
            Integrate lion population models into your own conservation workflows.
          </p>
        </header>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-sm animate-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* New Key Reveal - Security Priority */}
        {newKeyValue && (
          <div className="p-8 rounded-[2.5rem] bg-emerald-500/10 border-2 border-emerald-500/30 backdrop-blur-3xl space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                <Check className="w-6 h-6" /> Key Created Successfully
              </h3>
              <p className="text-sm text-emerald-400/70 font-medium">
                Make sure to copy your new API key now. You won't be able to see it again for security reasons.
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-emerald-500/20">
              <code className="flex-1 font-mono text-lg text-emerald-300 break-all select-all">
                {newKeyValue}
              </code>
              <button 
                onClick={() => copyToClipboard(newKeyValue)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all h-fit"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied!' : 'Copy Key'}
              </button>
            </div>

            <button 
              onClick={() => setNewKeyValue(null)}
              className="text-sm font-bold text-white/40 hover:text-white transition-colors"
            >
              I've saved my key securely
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-effect p-8 rounded-[2.5rem] border border-white/10 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Active Tokens <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/50">{keys.length}</span>
              </h2>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-white/20">
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <span className="text-sm font-bold uppercase tracking-widest">Loading keys...</span>
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-white/30 border-2 border-dashed border-white/5 rounded-3xl">
                  <Key className="w-12 h-12 mx-auto opacity-20" />
                  <p className="font-medium">No active API keys found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {keys.map(key => (
                    <div key={key.id} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                      <div className="space-y-1">
                        <div className="font-bold tracking-tight text-lg">{key.name}</div>
                        <div className="flex items-center gap-3">
                          <code className="text-xs font-mono text-emerald-400/70">{key.prefix}</code>
                          <span className="text-[10px] text-white/20 uppercase font-bold tracking-widest">
                            Created {new Date(key.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleRevoke(key.id)}
                        disabled={revoking === key.id}
                        className="p-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      >
                        {revoking === key.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Creation Section */}
          <div className="space-y-6">
            <div className="glass-effect p-8 rounded-[2.5rem] border border-white/10 space-y-6 sticky top-8">
              <h2 className="text-xl font-bold">New Connection</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] items-center uppercase font-black tracking-[0.2em] text-white/40 block">Key Description</label>
                  <input 
                    type="text" 
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Wildlife Monitoring Bot" 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={creating || !newKeyName.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/10 disabled:text-white/20 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Generate Token
                </button>
              </form>

              <div className="pt-6 border-t border-white/10">
                <a href="/documentation" className="flex items-center gap-3 text-sm font-bold text-emerald-400/60 hover:text-emerald-400 transition-colors group">
                  <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 group-hover:bg-emerald-500/20 transition-all">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  System Documentation
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
