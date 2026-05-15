'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

interface User {
  id: number;
  email: string;
  full_name: string;
  organization: string;
  role: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Password change state ────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPw, setChangingPw] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((u: User) => { setUser(u); setFullName(u.full_name); setOrganization(u.organization); })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router, token]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      // The backend doesn't have a PATCH /auth/me yet — placeholder call
      // When the endpoint is added, update this fetch.
      await new Promise(r => setTimeout(r, 500)); // simulate
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMessage({ type: 'error', text: 'New passwords do not match.' }); return; }
    if (newPw.length < 8) { setPwMessage({ type: 'error', text: 'Password must be at least 8 characters.' }); return; }
    setChangingPw(true);
    setPwMessage(null);
    try {
      await new Promise(r => setTimeout(r, 500)); // placeholder
      setPwMessage({ type: 'success', text: 'Password changed. Please log in again.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      setPwMessage({ type: 'error', text: 'Failed to change password.' });
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) return <ProtectedRoute><div style={s.loader}>Loading profile…</div></ProtectedRoute>;

  return (
    <ProtectedRoute>
      <div style={s.page}>
        <h1 style={s.title}>Profile Settings</h1>

        {/* Avatar + info */}
        <div style={s.avatarRow}>
          <div style={s.avatar}>{user?.full_name.charAt(0).toUpperCase()}</div>
          <div>
            <div style={s.avatarName}>{user?.full_name}</div>
            <div style={s.avatarEmail}>{user?.email}</div>
            <span style={s.roleBadge}>{user?.role}</span>
          </div>
        </div>

        <div style={s.grid}>
          {/* Personal details card */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Personal Details</h2>
            <form onSubmit={handleSave}>
              <Field label="Full Name" id="fullName">
                <input id="fullName" style={s.input} value={fullName} onChange={e => setFullName(e.target.value)} required />
              </Field>
              <Field label="Email Address" id="email">
                <input id="email" style={{ ...s.input, ...s.inputDisabled }} value={user?.email ?? ''} disabled />
              </Field>
              <Field label="Organization" id="org">
                <input id="org" style={s.input} value={organization} onChange={e => setOrganization(e.target.value)} />
              </Field>
              <Field label="Role" id="role">
                <input id="role" style={{ ...s.input, ...s.inputDisabled }} value={user?.role ?? ''} disabled />
              </Field>

              {message && <Banner type={message.type}>{message.text}</Banner>}

              <button type="submit" style={s.saveBtn} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Password card */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Change Password</h2>
            <form onSubmit={handlePasswordChange}>
              <Field label="Current Password" id="curPw">
                <input id="curPw" type="password" style={s.input} value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
              </Field>
              <Field label="New Password" id="newPw">
                <input id="newPw" type="password" style={s.input} value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={8} />
              </Field>
              <Field label="Confirm New Password" id="confirmPw">
                <input id="confirmPw" type="password" style={s.input} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
              </Field>

              {pwMessage && <Banner type={pwMessage.type}>{pwMessage.text}</Banner>}

              <button type="submit" style={s.saveBtn} disabled={changingPw}>
                {changingPw ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor={id} style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

function Banner({ type, children }: { type: 'success' | 'error'; children: React.ReactNode }) {
  return (
    <div style={{ margin: '0.75rem 0', padding: '0.65rem 1rem', borderRadius: 8, fontSize: '0.85rem', background: type === 'success' ? '#e8f5e9' : '#ffebee', color: type === 'success' ? '#2e7d32' : '#c62828' }}>
      {type === 'success' ? '✓ ' : '✗ '}{children}
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'Inter, system-ui, sans-serif' },
  loader: { padding: '4rem', textAlign: 'center', color: '#888' },
  title: { margin: '0 0 1.5rem', fontSize: '1.5rem', fontWeight: 700, color: '#1a1a2e' },
  avatarRow: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1rem 1.25rem', background: '#fff', borderRadius: 12, border: '1px solid #e0e0e0' },
  avatar: { width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #4CAF50, #2196F3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0 },
  avatarName: { fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' },
  avatarEmail: { fontSize: '0.85rem', color: '#666', margin: '2px 0' },
  roleBadge: { display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 999, background: '#e8f5e9', color: '#2e7d32', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e0e0e0', padding: '1.5rem' },
  cardTitle: { margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a2e' },
  input: { width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', color: '#333', boxSizing: 'border-box', outline: 'none' },
  inputDisabled: { background: '#f5f5f5', color: '#999', cursor: 'not-allowed' },
  saveBtn: { marginTop: '0.5rem', width: '100%', padding: '0.7rem', borderRadius: 8, border: 'none', background: '#4CAF50', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' },
};
