import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, AlertTriangle, FileText, Package, Truck, Users, ArrowRight, X, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
  issue:         { icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-900/30',    dot: 'bg-red-500' },
  invoice:       { icon: FileText,      color: 'text-orange-400', bg: 'bg-orange-900/30', dot: 'bg-orange-500' },
  order:         { icon: Package,       color: 'text-blue-400',   bg: 'bg-blue-900/30',   dot: 'bg-blue-500' },
  trip:          { icon: Truck,         color: 'text-cyan-400',   bg: 'bg-cyan-900/30',   dot: 'bg-cyan-400' },
  trip_done:     { icon: Truck,         color: 'text-green-400',  bg: 'bg-green-900/30',  dot: 'bg-green-500' },
  client:        { icon: Users,         color: 'text-violet-400', bg: 'bg-violet-900/30', dot: 'bg-violet-500' },
  status_change: { icon: ArrowRight,    color: 'text-slate-400',  bg: 'bg-slate-700/40',  dot: 'bg-slate-400' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'преди малко';
  if (m < 60) return `преди ${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `преди ${h} ч`;
  return `преди ${Math.floor(h / 24)} дни`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState(new Set());
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(
        (data.notifications || []).filter(n => !readIds.has(n.id)).length
      );
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [readIds]);

  // Poll every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleOpen() {
    setOpen(o => !o);
    if (!open) {
      // Mark all as read visually
      const ids = new Set(notifications.map(n => n.id));
      setReadIds(ids);
      setUnreadCount(0);
    }
  }

  function handleNotifClick(notif) {
    setOpen(false);
    navigate(notif.link);
  }

  const unread = notifications.filter(n => !readIds.has(n.id)).length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-xl text-white transition-all hover:scale-105"
        style={{ background: 'rgba(0,0,0,0.22)', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
        title="Нотификации"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-[300] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-white">Нотификации</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchNotifications}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                title="Опресни"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-700/50">
            {notifications.length === 0 && !loading && (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                Няма нотификации
              </div>
            )}
            {loading && notifications.length === 0 && (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">Зарежда...</div>
            )}
            {notifications.map(notif => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.status_change;
              const Icon = cfg.icon;
              const isUnread = !readIds.has(notif.id);
              return (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors ${
                    isUnread ? 'bg-slate-700/20' : ''
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white">{notif.title}</span>
                      {isUnread && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 truncate">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {notif.meta && <span className="text-[10px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">{notif.meta}</span>}
                      <span className="text-[10px] text-slate-500">{timeAgo(notif.createdAt)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-700 flex items-center justify-between gap-3">
              <button
                onClick={() => { setReadIds(new Set(notifications.map(n => n.id))); setUnreadCount(0); setOpen(false); }}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Прочетени
              </button>
              <button
                onClick={() => { setOpen(false); navigate('/dispatcher/notifications'); }}
                className="text-xs font-semibold text-green-400 hover:text-green-300 transition-colors"
              >
                Отвори всички →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
