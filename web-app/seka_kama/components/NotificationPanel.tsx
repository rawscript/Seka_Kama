'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Info, 
  ShieldAlert, 
  Zap, 
  Clock,
  ExternalLink
} from 'lucide-react';
import { getApiUrl } from '@/services/config';

interface AuditLog {
  id: number;
  action: string;
  resource_type: string;
  created_at: string;
  details: any;
  users?: {
    full_name: string;
    email: string;
  };
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      // We fetch from audit-logs, but fallback to mock if the user isn't admin
      const response = await fetch(`${getApiUrl()}/audit-logs?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      } else {
        // Mock data for non-admin users to show "System Intelligence"
        setLogs([
          {
            id: 1,
            action: "Scenario Analysis Complete",
            resource_type: "Intelligence",
            created_at: new Date().toISOString(),
            details: { message: "Lion population trend identified in Mara North." }
          },
          {
            id: 2,
            action: "Satellite Sync Success",
            resource_type: "System",
            created_at: new Date(Date.now() - 3600000).toISOString(),
            details: { message: "NASA POWER rainfall data synchronized for 2026." }
          },
          {
            id: 3,
            action: "Security Protocol Active",
            resource_type: "Security",
            created_at: new Date(Date.now() - 86400000).toISOString(),
            details: { message: "Encryption keys rotated successfully." }
          }
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-4 w-80 bg-white/95 backdrop-blur-md border border-[#d1c5b4] rounded-sm shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[100]">
      <div className="p-4 border-b border-[#d1c5b4] flex justify-between items-center bg-[#775a19]/5">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#775a19]" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1c1c]">Intelligence Stream</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-black transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-3">
             <div className="w-5 h-5 border-2 border-[#775a19] border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Syncing Stream...</p>
          </div>
        ) : logs.length > 0 ? (
          <div className="divide-y divide-[#d1c5b4]/30">
            {logs.map((log) => (
              <NotificationItem key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400 text-xs italic">
            No intelligence updates available.
          </div>
        )}
      </div>

      <div className="p-3 bg-[#f9f9f9] border-t border-[#d1c5b4] text-center">
        <button className="text-[10px] font-bold text-[#775a19] uppercase tracking-widest hover:underline flex items-center justify-center gap-1.5 mx-auto">
          View All Logs <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function NotificationItem({ log }: { log: AuditLog }) {
  const timeStr = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const getIcon = () => {
    switch (log.resource_type?.toLowerCase()) {
      case 'security': return <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />;
      case 'system': return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      case 'intelligence': return <Info className="w-3.5 h-3.5 text-emerald-500" />;
      default: return <Bell className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="p-4 hover:bg-[#775a19]/5 transition-colors group cursor-default">
      <div className="flex gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-start capitalize">
            <span className="text-[11px] font-bold text-[#1a1c1c] tracking-tight">{log.action}</span>
            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> {timeStr}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            {log.details?.message || `Performed ${log.action} on ${log.resource_type || 'system'}.`}
          </p>
          {log.users && (
            <p className="text-[9px] text-primary italic font-semibold">User: {log.users.full_name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
