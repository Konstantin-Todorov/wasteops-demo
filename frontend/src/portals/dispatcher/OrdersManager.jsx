import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import StatusBadge from '../../components/shared/StatusBadge';
import { Check, X, ChevronDown, ChevronUp, Search, RefreshCw, Clock, Edit2, Save, Plus, Phone, Mail, Globe } from 'lucide-react';

const TABS = [
  { key: 'PENDING_ADMIN', label: 'Чакащи одобрение' },
  { key: 'active',        label: 'Активни' },
  { key: 'all',           label: 'Всички' },
];

const WASTE_TYPES = ['', 'строителни', 'смесени', 'инертни', 'метални', 'производствени', 'индустриални', 'битови', 'земеделски'];

const EVENT_ICONS = {
  order_created: '📝', admin_confirmed: '✅', admin_rejected: '❌',
  container_delivered: '📦', container_full: '🔔', pickup_scheduled: '🗓️',
  in_transit: '🚛', at_disposal: '🏭', admin_verified: '✔️', completed: '🎉',
  cancelled: '🚫',
};

const EVENT_LABELS = {
  order_created: 'Заявка подадена',
  admin_confirmed: 'Потвърдена от администратор',
  admin_rejected: 'Отказана от администратор',
  container_delivered: 'Контейнер доставен',
  container_full: 'Клиентът отбеляза пълен',
  pickup_scheduled: 'Насрочено вземане',
  in_transit: 'Камионът тръгна',
  at_disposal: 'Пристигнал в депо',
  admin_verified: 'Верифицирано от администратор',
  completed: 'Услугата е завършена',
  cancelled: 'Заявката е отменена',
};

const ACTIVE_STATUSES = ['CONFIRMED','DELIVERY_SCHEDULED','CONTAINER_DELIVERED','AWAITING_FILL','PICKUP_SCHEDULED','SCHEDULED','IN_TRANSIT','AT_DISPOSAL','PENDING_VERIFICATION'];

const SOURCE_CHANNELS = [
  { value: 'WEB', label: 'Уеб портал', icon: '🌐' },
  { value: 'PHONE', label: 'Телефон', icon: '📞' },
  { value: 'EMAIL', label: 'Имейл', icon: '📧' },
  { value: 'IN_PERSON', label: 'На място', icon: '🤝' },
  { value: 'CONTRACT', label: 'Договор', icon: '📄' },
];

export default function OrdersManager() {
  const { user } = useAuth();
  const [tab, setTab]               = useState('PENDING_ADMIN');
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('');
  const [expanded, setExpanded]     = useState(null);
  const [editing, setEditing]       = useState(null);
  const [actioning, setActioning]   = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadOrders(); }, [tab]);

  async function loadOrders() {
    setLoading(true);
    try {
      let url = '/orders?';
      if (tab === 'PENDING_ADMIN') url += 'status=PENDING_ADMIN';
      else if (tab === 'active') url += 'status=' + ACTIVE_STATUSES.join(',');
      const data = await api.get(url);
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders(MOCK_ORDERS);
    } finally {
      setLoading(false);
    }
  }

  async function approveOrder(id) {
    setActioning(id + '_confirm');
    try {
      await api.patch(`/orders/${id}/confirm`, {});
      await loadOrders();
    } catch (e) { alert(e.message); }
    finally { setActioning(null); }
  }

  async function cancelOrder(id) {
    if (!window.confirm('Откажи тази заявка?')) return;
    setActioning(id + '_cancel');
    try {
      await api.patch(`/orders/${id}/cancel`, {});
      await loadOrders();
    } catch (e) { alert(e.message); }
    finally { setActioning(null); }
  }

  async function saveEdit(id, data) {
    setActioning(id + '_edit');
    try {
      await api.patch(`/orders/${id}`, data);
      setEditing(null);
      await loadOrders();
    } catch (e) { alert(e.message); }
    finally { setActioning(null); }
  }

  const filtered = orders.filter(o => {
    if (search && !o.client?.name?.toLowerCase().includes(search.toLowerCase()) && !o.address?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType && o.orderType !== filterType) return false;
    return true;
  });

  const pendingCount = orders.filter(o => o.status === 'PENDING_ADMIN').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Заявки</h1>
          <p className="text-slate-500 text-sm mt-0.5">Управление и одобрение на заявки</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadOrders} className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 px-3 py-1.5 border border-slate-200 rounded-lg bg-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Нова заявка
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
            {t.key === 'PENDING_ADMIN' && pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Търси клиент или адрес..."
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500 w-60"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Всички типове</option>
          <option value="CONTAINER">📦 Контейнер</option>
          <option value="GARBAGE_TRUCK">🚛 Сметовоз</option>
        </select>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw className="w-6 h-6 text-green-600 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">Няма заявки</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              isExpanded={expanded === order.id}
              isEditing={editing === order.id}
              onToggle={() => { setExpanded(expanded === order.id ? null : order.id); setEditing(null); }}
              onStartEdit={() => { setEditing(order.id); setExpanded(order.id); }}
              onCancelEdit={() => setEditing(null)}
              onSaveEdit={(data) => saveEdit(order.id, data)}
              onApprove={() => approveOrder(order.id)}
              onCancel={() => cancelOrder(order.id)}
              actioning={actioning}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadOrders(); }}
        />
      )}
    </div>
  );
}

function CreateOrderModal({ onClose, onCreated }) {
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    orderType: 'CONTAINER',
    sourceChannel: 'PHONE',
    address: '',
    lat: '',
    lng: '',
    wasteType: 'Строителни отпадъци',
    volumeM3: 7,
    estimatedKg: 7000,
    requestedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    paymentMethod: 'INVOICE',
    notes: '',
  });

  useEffect(() => {
    api.get('/clients').then(d => setClients(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  function set(f, v) { setForm(p => ({ ...p, [f]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.clientId) { alert('Изберете клиент'); return; }
    if (!form.address) { alert('Въведете адрес'); return; }
    setSaving(true);
    try {
      await api.post('/orders', {
        ...form,
        lat: parseFloat(form.lat) || 43.8619,
        lng: parseFloat(form.lng) || 26.0348,
        volumeM3: form.orderType === 'CONTAINER' ? parseFloat(form.volumeM3) : null,
        estimatedKg: parseInt(form.estimatedKg),
        requestedDate: new Date(form.requestedDate).toISOString(),
      });
      onCreated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const WASTE_OPTIONS = ['Строителни отпадъци','Смесени строителни','Инертни материали','Домашен ремонт','Метални отпадъци','Дървени материали','Индустриални отпадъци','Битови отпадъци'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Нова заявка — ръчно въвеждане</h2>
            <p className="text-xs text-slate-400 mt-0.5">За заявки по телефон, имейл или на място</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Source channel */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Канал на постъпване</label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_CHANNELS.map(ch => (
                <button key={ch.value} type="button"
                  onClick={() => set('sourceChannel', ch.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    form.sourceChannel === ch.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                  <span>{ch.icon}</span> {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Клиент *</label>
            <select value={form.clientId} onChange={e => set('clientId', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
              <option value="">— Изберете клиент —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.type === 'CORPORATE' ? '🏢' : '👤'}</option>
              ))}
            </select>
          </div>

          {/* Order type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Тип услуга</label>
            <div className="flex gap-2">
              {[['CONTAINER','📦 Контейнер'],['GARBAGE_TRUCK','🚛 Сметовоз']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => set('orderType', val)}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                    form.orderType === val ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Адрес на обекта *</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} required
                placeholder="ул. Борисова 45, Русе"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ширина (lat)</label>
              <input type="number" step="any" value={form.lat} onChange={e => set('lat', e.target.value)}
                placeholder="43.8619" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Дължина (lng)</label>
              <input type="number" step="any" value={form.lng} onChange={e => set('lng', e.target.value)}
                placeholder="26.0348" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="flex items-end">
              <p className="text-xs text-slate-400">Незадължително — ако не е зададено, ще се използва центърът на Русе</p>
            </div>
          </div>

          {/* Waste + volume */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Вид отпадък</label>
              <select value={form.wasteType} onChange={e => set('wasteType', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                {WASTE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {form.orderType === 'CONTAINER' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Обем (м³)</label>
                <select value={form.volumeM3} onChange={e => set('volumeM3', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  {[1.1,4,7,10,20,30].map(v => <option key={v} value={v}>{v} м³</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Приблизително тегло (кг)</label>
              <input type="number" value={form.estimatedKg} onChange={e => set('estimatedKg', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>

          {/* Date + payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Желана дата</label>
              <input type="date" value={form.requestedDate} onChange={e => set('requestedDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Начин на плащане</label>
              <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                <option value="INVOICE">🧾 Фактура</option>
                <option value="CASH">💵 В брой</option>
                <option value="CARD">💳 Карта</option>
                <option value="BANK_TRANSFER">🏦 Банков превод</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Бележки</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              placeholder="Достъп, работно време, специфики за обекта..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>
        </form>

        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Откажи
          </button>
          <button onClick={submit} disabled={saving || !form.clientId || !form.address}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
            {saving ? 'Записване...' : '✅ Създай заявка'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, isExpanded, isEditing, onToggle, onStartEdit, onCancelEdit, onSaveEdit, onApprove, onCancel, actioning }) {
  const isPending   = order.status === 'PENDING_ADMIN';
  const canEdit     = ['PENDING_ADMIN', 'CONFIRMED'].includes(order.status);
  const canCancel   = !['COMPLETED', 'CANCELLED'].includes(order.status);
  const dateStr     = order.requestedDate
    ? new Date(order.requestedDate).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const [editForm, setEditForm] = useState({
    requestedDate: order.requestedDate ? new Date(order.requestedDate).toISOString().split('T')[0] : '',
    notes: order.notes || '',
    wasteType: order.wasteType || '',
    volumeM3: order.volumeM3 || '',
    estimatedKg: order.estimatedKg || '',
  });

  function setField(f, v) { setEditForm(p => ({ ...p, [f]: v })); }

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${isPending ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${order.orderType === 'CONTAINER' ? 'bg-indigo-50' : 'bg-slate-100'}`}>
            {order.orderType === 'CONTAINER' ? '📦' : '🚛'}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800 text-sm">{order.client?.name || 'Клиент'}</span>
              <StatusBadge status={order.status} />
              <StatusBadge type={order.orderType} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5 truncate">📍 {order.address}</p>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 flex-wrap">
              <span>🗓️ {dateStr}</span>
              <span>♻️ {order.wasteType || '—'}</span>
              {order.volumeM3 && <span>📐 {order.volumeM3} м³</span>}
              {order.estimatedKg && <span>⚖️ {order.estimatedKg} кг</span>}
              {order.paymentMethod && <span>💳 {order.paymentMethod}</span>}
              {order.sourceChannel && (
                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                  {SOURCE_CHANNELS.find(c => c.value === order.sourceChannel)?.icon} {SOURCE_CHANNELS.find(c => c.value === order.sourceChannel)?.label || order.sourceChannel}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
            {isPending && (
              <button onClick={onApprove} disabled={!!actioning}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                <Check className="w-3.5 h-3.5" />
                Потвърди
              </button>
            )}
            {canEdit && !isEditing && (
              <button onClick={onStartEdit}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
                Редактирай
              </button>
            )}
            {canCancel && (
              <button onClick={onCancel} disabled={!!actioning}
                className="p-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Откажи заявката">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 p-1.5">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {isEditing && (
        <div className="border-t border-amber-100 bg-amber-50 px-4 py-4">
          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">✏️ Редактиране на заявка</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Желана дата</label>
              <input type="date" value={editForm.requestedDate} onChange={e => setField('requestedDate', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Вид отпадък</label>
              <select value={editForm.wasteType} onChange={e => setField('wasteType', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                {WASTE_TYPES.map(t => <option key={t} value={t}>{t || '—'}</option>)}
              </select>
            </div>
            {order.orderType === 'CONTAINER' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Обем (м³)</label>
                <input type="number" value={editForm.volumeM3} onChange={e => setField('volumeM3', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Тегло (кг)</label>
              <input type="number" value={editForm.estimatedKg} onChange={e => setField('estimatedKg', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Бележки</label>
            <textarea value={editForm.notes} onChange={e => setField('notes', e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={onCancelEdit} className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors">
              Откажи
            </button>
            <button onClick={() => onSaveEdit(editForm)} disabled={!!actioning}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
              <Save className="w-3 h-3" />
              Запази промените
            </button>
          </div>
        </div>
      )}

      {/* Events timeline */}
      {isExpanded && !isEditing && (
        <div className="border-t border-slate-100 px-4 py-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">История</h4>
          {order.events?.length > 0 ? (
            <div className="space-y-2">
              {order.events.map((ev, i) => (
                <div key={ev.id || i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">
                      {EVENT_ICONS[ev.eventType] || '•'}
                    </div>
                    {i < order.events.length - 1 && <div className="w-px h-3 bg-slate-200 mt-0.5" />}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-medium text-slate-700">{EVENT_LABELS[ev.eventType] || ev.eventType}</p>
                    {ev.notes && <p className="text-xs text-slate-500">{ev.notes}</p>}
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(ev.createdAt).toLocaleString('bg-BG')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">Няма записани събития</p>}

          {order.notes && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1">Бележки</p>
              <p className="text-sm text-slate-600">{order.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const MOCK_ORDERS = [
  {
    id: '1', status: 'PENDING_ADMIN', orderType: 'CONTAINER',
    wasteType: 'строителни', address: 'ул. Борисова 45, Русе',
    estimatedKg: 3000, volumeM3: 7,
    requestedDate: new Date().toISOString(),
    client: { name: 'СтройТехника ООД' },
    events: [{ eventType: 'order_created', createdAt: new Date().toISOString(), notes: 'Поръчка подадена онлайн' }],
  },
  {
    id: '2', status: 'AWAITING_FILL', orderType: 'CONTAINER',
    wasteType: 'инертни', address: 'ул. Белмекен 5, Русе',
    estimatedKg: 8000, volumeM3: 10,
    requestedDate: new Date().toISOString(),
    client: { name: 'Агро Индустрия АД' },
    events: [
      { eventType: 'order_created', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { eventType: 'admin_confirmed', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { eventType: 'container_delivered', createdAt: new Date(Date.now() - 86400000).toISOString(), notes: 'Контейнер оставен' },
    ],
  },
];
