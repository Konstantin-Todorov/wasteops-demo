import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  TrendingUp, TrendingDown, Package, Truck, CheckCircle, Users,
  RefreshCw, AlertTriangle, Clock, Zap, FileText, MapPin, ArrowRight
} from 'lucide-react';

const PIE_COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444'];

function KpiCard({ label, value, sub, icon: Icon, color = 'green', trend, onClick }) {
  const colors = {
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  val: 'text-green-700',  border: 'border-green-100' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  val: 'text-amber-700',  border: 'border-amber-100' },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   val: 'text-blue-700',   border: 'border-blue-100' },
    slate:  { bg: 'bg-slate-50',  icon: 'text-slate-500',  val: 'text-slate-700',  border: 'border-slate-100' },
    red:    { bg: 'bg-red-50',    icon: 'text-red-600',    val: 'text-red-700',    border: 'border-red-100' },
  };
  const c = colors[color];
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border ${c.border} p-5 shadow-sm transition-shadow ${onClick ? 'hover:shadow-md cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${c.val}`}>{value ?? '—'}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}% спрямо миналия месец
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

function StatusPill({ status }) {
  const cfg = {
    PENDING_ADMIN:  { l: 'Чака одобрение', c: 'bg-amber-100 text-amber-700' },
    CONFIRMED:      { l: 'Потвърдена',      c: 'bg-blue-100 text-blue-700' },
    COMPLETED:      { l: 'Завършена',       c: 'bg-green-100 text-green-700' },
    IN_TRANSIT:     { l: 'В движение',      c: 'bg-yellow-100 text-yellow-700' },
    AWAITING_FILL:  { l: 'Чака пълнене',    c: 'bg-purple-100 text-purple-700' },
    SCHEDULED:      { l: 'Насрочена',       c: 'bg-sky-100 text-sky-700' },
  }[status] || { l: status, c: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.c}`}>{cfg.l}</span>;
}

function TruckStatusRow({ truck }) {
  const days90 = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(date) - new Date()) / 86400000);
  };
  const expiringDocs = [
    { label: 'ГТП', days: days90(truck.gtpDate) },
    { label: 'Гражданска', days: days90(truck.civilDate) },
    { label: 'Винетка', days: days90(truck.vignetteDate) },
  ].filter(d => d.days !== null && d.days < 90);

  const statusColor = truck.status === 'AVAILABLE' ? 'bg-green-400' : 'bg-amber-400';
  const statusLabel = truck.status === 'AVAILABLE' ? 'Активен' : 'На сервиз';

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: truck.color || '#64748b' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800">{truck.plate}</p>
          <span className="text-xs text-slate-400">{truck.model}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} title={statusLabel} />
        </div>
        <p className="text-xs text-slate-400">{truck.driver?.name || 'Без шофьор'}</p>
      </div>
      {expiringDocs.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-end">
          {expiringDocs.map(d => (
            <span key={d.label} className={`text-xs px-1.5 py-0.5 rounded font-medium ${d.days < 0 ? 'bg-red-100 text-red-700' : d.days < 30 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
              {d.label} {d.days < 0 ? '⚠️ изтекла' : `${d.days}д`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardBI() {
  const [data, setData] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [d, tr, inv] = await Promise.allSettled([
        api.get('/analytics/dashboard'),
        api.get('/trucks'),
        api.get('/invoices'),
      ]);
      setData(d.status === 'fulfilled' ? d.value : getMockData());
      setTrucks(d.status === 'fulfilled' && Array.isArray(tr.value) ? tr.value : []);
      setInvoices(inv.status === 'fulfilled' && Array.isArray(inv.value) ? inv.value : []);
    } catch {
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
    </div>
  );

  const d = data;

  // Derived data
  const wasteBarData = d.byWasteType?.map(w => ({ name: w.wasteType, count: w.count ?? 0 })) || [];
  const typeData = [
    { name: 'Контейнер', value: d.byType?.CONTAINER || 0 },
    { name: 'Сметосъбирач', value: d.byType?.GARBAGE_TRUCK || 0 },
  ];
  const trend = d.ordersLastMonth > 0
    ? Math.round((d.ordersThisMonth - d.ordersLastMonth) / d.ordersLastMonth * 100)
    : 0;

  // Trucks with expiring docs (< 90 days)
  const expiringTrucks = trucks.filter(t =>
    [t.gtpDate, t.civilDate, t.vignetteDate].some(date => {
      if (!date) return false;
      const days = Math.ceil((new Date(date) - new Date()) / 86400000);
      return days < 90;
    })
  );

  // Invoices stats
  const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE' || (i.status !== 'PAID' && new Date(i.dueDate) < new Date()));
  const unpaidTotal = invoices
    .filter(i => i.status !== 'PAID')
    .reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0);
  const paidThisMonth = invoices
    .filter(i => i.status === 'PAID' && new Date(i.paidAt || i.updatedAt) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    .reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0);

  // Top clients from recent orders
  const clientOrderMap = {};
  (d.recentOrders || []).forEach(o => {
    if (o.client) {
      if (!clientOrderMap[o.client.name]) clientOrderMap[o.client.name] = { name: o.client.name, type: o.client.type, count: 0 };
      clientOrderMap[o.client.name].count++;
    }
  });
  const topClients = Object.values(clientOrderMap).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Табло</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('bg-BG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={loadAll} className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 transition-colors px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:border-green-300">
          <RefreshCw className="w-4 h-4" />
          Обнови
        </button>
      </div>

      {/* Alert strip */}
      {(d.pendingAdmin > 0 || expiringTrucks.length > 0 || overdueInvoices.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {d.pendingAdmin > 0 && (
            <button onClick={() => navigate('/dispatcher/orders')}
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 hover:bg-amber-100 transition-colors">
              <Clock className="w-4 h-4 text-amber-600" />
              <strong>{d.pendingAdmin}</strong> заявки чакат одобрение
              <ArrowRight className="w-3 h-3 text-amber-500" />
            </button>
          )}
          {expiringTrucks.length > 0 && (
            <button onClick={() => navigate('/dispatcher/trucks')}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 hover:bg-red-100 transition-colors">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <strong>{expiringTrucks.length}</strong> камиона с изтичащи документи
              <ArrowRight className="w-3 h-3 text-red-400" />
            </button>
          )}
          {overdueInvoices.length > 0 && (
            <button onClick={() => navigate('/dispatcher/invoices')}
              className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 hover:bg-orange-100 transition-colors">
              <FileText className="w-4 h-4 text-orange-500" />
              <strong>{overdueInvoices.length}</strong> просрочени фактури
              <ArrowRight className="w-3 h-3 text-orange-400" />
            </button>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Чакащи одобрение" value={d.pendingAdmin} icon={Clock} color="amber"
          sub="нови заявки от клиенти"
          onClick={() => navigate('/dispatcher/orders')}
        />
        <KpiCard
          label="В изпълнение" value={d.inProgress} icon={Truck} color="blue"
          sub="активни поръчки"
          onClick={() => navigate('/dispatcher/map')}
        />
        <KpiCard
          label="Завършени (месец)" value={d.completedThisMonth} icon={CheckCircle} color="green"
          trend={trend}
        />
        <KpiCard
          label="Неплатени фактури" value={overdueInvoices.length}
          sub={unpaidTotal > 0 ? `${unpaidTotal.toFixed(0)}€ неплатени` : 'всичко е наред'}
          icon={FileText} color={overdueInvoices.length > 0 ? 'red' : 'slate'}
          onClick={() => navigate('/dispatcher/invoices')}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Заявки — последните 7 дни</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.weeklyTrend || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => {
                if (!v || v.length < 10) return v;
                return new Date(v).toLocaleDateString('bg-BG', { weekday: 'short' });
              }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="orders" name="Нови" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="completed" name="Завършени" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">По тип услуга</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row: Waste types + Fleet + Clients */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Waste type bar chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">По вид отпадък</h2>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={wasteBarData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Заявки" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fleet status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Флот</h2>
            <button onClick={() => navigate('/dispatcher/trucks')} className="text-xs text-green-600 hover:text-green-700 font-medium">
              Управление →
            </button>
          </div>
          {trucks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Няма регистрирани автомобили</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {trucks.map(truck => <TruckStatusRow key={truck.id} truck={truck} />)}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-400">
            <span>{trucks.filter(t => t.status === 'AVAILABLE').length} активни</span>
            <span>{trucks.filter(t => t.status === 'MAINTENANCE').length} на сервиз</span>
            <span>{expiringTrucks.length} с изтичащи документи</span>
          </div>
        </div>

        {/* Right column: Top clients + Finance */}
        <div className="space-y-4">
          {/* Financial snapshot */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">Финанси</h2>
              <button onClick={() => navigate('/dispatcher/invoices')} className="text-xs text-green-600 hover:text-green-700 font-medium">
                Фактури →
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Платено (месец)</span>
                <span className="text-sm font-bold text-green-600">{paidThisMonth.toFixed(0)}€</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Неплатени</span>
                <span className={`text-sm font-bold ${unpaidTotal > 0 ? 'text-red-600' : 'text-slate-400'}`}>{unpaidTotal.toFixed(0)}€</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Просрочени фактури</span>
                <span className={`text-sm font-bold ${overdueInvoices.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{overdueInvoices.length}</span>
              </div>
            </div>
          </div>

          {/* Top clients */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Топ клиенти</h2>
            {topClients.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Няма данни</p>
            ) : (
              <div className="space-y-2">
                {topClients.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-4 font-bold">{i + 1}</span>
                    <span className="text-xs">{c.type === 'CORPORATE' ? '🏢' : '👤'}</span>
                    <span className="text-sm text-slate-700 flex-1 truncate">{c.name}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Efficiency strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-4">
          <div className="text-3xl">🛣️</div>
          <div>
            <div className="text-xl font-bold text-green-700">{d.kmSavedTotal || 0} км</div>
            <div className="text-sm font-medium text-green-800">Спестени км (общо)</div>
            <div className="text-xs text-green-600 mt-0.5">чрез AI оптимизация на маршрути</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-center gap-4">
          <div className="text-3xl">⛽</div>
          <div>
            <div className="text-xl font-bold text-blue-700">{d.fuelSavedPct || 0}%</div>
            <div className="text-sm font-medium text-blue-800">По-малко гориво</div>
            <div className="text-xs text-blue-600 mt-0.5">спрямо неоптимизирани маршрути</div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center gap-4">
          <div className="text-3xl">📈</div>
          <div>
            <div className="text-xl font-bold text-amber-700">{d.ordersThisMonth || 0}</div>
            <div className="text-sm font-medium text-amber-800">Заявки тази седмица</div>
            <div className="text-xs text-amber-600 mt-0.5">
              {trend >= 0 ? `+${trend}%` : `${trend}%`} спрямо миналия период
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">Последни заявки</h2>
          <button onClick={() => navigate('/dispatcher/orders')} className="text-xs text-green-600 hover:text-green-700 font-medium">
            Всички заявки →
          </button>
        </div>
        <div className="space-y-1">
          {(d.recentOrders || []).slice(0, 8).map(o => (
            <div key={o.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700 truncate">{o.client?.name || '—'}</p>
                <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 inline" />{o.address}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-slate-400">
                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' }) : ''}
                </span>
                <StatusPill status={o.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getMockData() {
  return {
    pendingAdmin: 8, inProgress: 3, completedThisMonth: 12, totalClients: 15,
    ordersThisMonth: 21, ordersLastMonth: 17,
    kmSavedTotal: 1247, fuelSavedPct: 22,
    byType: { CONTAINER: 14, GARBAGE_TRUCK: 7 },
    byWasteType: [
      { wasteType: 'Строителни', count: 9 },
      { wasteType: 'Смесени', count: 6 },
      { wasteType: 'Инертни', count: 4 },
      { wasteType: 'Промишлени', count: 2 },
    ],
    weeklyTrend: (() => {
      const t = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        t.push({ date: d.toISOString().slice(0, 10), orders: [4,3,5,2,6,1,3][6-i], completed: [2,4,3,5,2,3,1][6-i] });
      }
      return t;
    })(),
    recentOrders: [
      { id: '1', client: { name: 'СтройТехника ООД', type: 'CORPORATE' }, address: 'ул. Борисова 12, Русе', status: 'PENDING_ADMIN', createdAt: new Date().toISOString() },
      { id: '2', client: { name: 'Иван Петров', type: 'INDIVIDUAL' }, address: 'ж.к. Чародейка, Русе', status: 'AWAITING_FILL', createdAt: new Date().toISOString() },
      { id: '3', client: { name: 'Агро Индустрия АД', type: 'CORPORATE' }, address: 'ул. Белмекен 5, Русе', status: 'COMPLETED', createdAt: new Date(Date.now()-86400000).toISOString() },
      { id: '4', client: { name: 'Две Могили Текс АД', type: 'CORPORATE' }, address: 'Две могили', status: 'IN_TRANSIT', createdAt: new Date(Date.now()-86400000).toISOString() },
      { id: '5', client: { name: 'Борислав Ненков', type: 'INDIVIDUAL' }, address: 'ул. Хан Аспарух 44, Русе', status: 'CONFIRMED', createdAt: new Date(Date.now()-172800000).toISOString() },
    ],
  };
}
