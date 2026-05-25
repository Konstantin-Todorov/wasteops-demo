import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, FileText, Package, Truck, Users, ArrowRight, RefreshCw, Filter } from 'lucide-react';
import { api } from '../../lib/api';

const TYPE_CONFIG = {
  issue:         { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100',   label: 'Проблем' },
  invoice:       { icon: FileText,      color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100',label: 'Фактура' },
  order:         { icon: Package,       color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-100',  label: 'Заявка' },
  trip:          { icon: Truck,         color: 'text-cyan-600',   bg: 'bg-cyan-50',   border: 'border-cyan-100',  label: 'Курс' },
  trip_done:     { icon: Truck,         color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100', label: 'Завършен' },
  client:        { icon: Users,         color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100',label: 'Клиент' },
  status_change: { icon: ArrowRight,    color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200', label: 'Събитие' },
};

const PRIORITY_BADGE = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-slate-100 text-slate-600',
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

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  async function fetchNotifications() {
    setLoading(true);
    try {
      const data = await api.get('/notifications');
      setNotifications(data.notifications || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchNotifications(); }, []);

  const types = ['all', 'issue', 'order', 'invoice', 'trip', 'client', 'status_change'];
  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);

  const highCount = notifications.filter(n => n.priority === 'high').length;

  function handleClick(notif) {
    navigate(notif.link);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1e9e5a, #155f37)' }}>
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Нотификации</h1>
            <p className="text-slate-500 text-sm">{notifications.length} общо · {highCount} с висок приоритет</p>
          </div>
        </div>
        <button
          onClick={fetchNotifications}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Опресни
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        {types.map(t => {
          const cfg = t === 'all' ? null : TYPE_CONFIG[t];
          const label = t === 'all' ? 'Всички' : cfg?.label;
          const count = t === 'all' ? notifications.length : notifications.filter(n => n.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === t
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-green-400 hover:text-green-700'
              }`}
            >
              {label}
              <span className={`text-[10px] px-1 rounded-full ${filter === t ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifications list */}
      {loading && (
        <div className="text-center py-16 text-slate-400">Зарежда...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Няма нотификации</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(notif => {
          const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.status_change;
          const Icon = cfg.icon;
          return (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border ${cfg.border} ${cfg.bg} hover:shadow-sm transition-all group`}
            >
              <div className={`w-9 h-9 rounded-lg bg-white shadow-sm border ${cfg.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-slate-800">{notif.title}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[notif.priority]}`}>
                    {notif.priority === 'high' ? 'висок' : notif.priority === 'medium' ? 'среден' : 'нисък'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 truncate">{notif.message}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  {notif.meta && (
                    <span className="text-xs text-slate-400 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-md">
                      {notif.meta}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{timeAgo(notif.createdAt)}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-green-500 transition-colors flex-shrink-0 mt-2.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
