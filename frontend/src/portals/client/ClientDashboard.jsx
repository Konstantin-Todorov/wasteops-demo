import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { socket, connectSocket } from '../../lib/socket';
import StatusBadge from '../../components/shared/StatusBadge';
import { Plus, CheckCircle, Clock, AlertCircle, Package } from 'lucide-react';

const ACTIVE_STATUSES = ['CONFIRMED','DELIVERY_SCHEDULED','CONTAINER_DELIVERED','AWAITING_FILL','PICKUP_SCHEDULED','SCHEDULED','IN_TRANSIT','AT_DISPOSAL','PENDING_VERIFICATION'];

function StatCard({ label, value, icon: Icon, color }) {
  const c = { green: 'text-green-600 bg-green-50', blue: 'text-blue-600 bg-blue-50', amber: 'text-amber-600 bg-amber-50', slate: 'text-slate-600 bg-slate-50' }[color];
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${c}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className={`text-2xl font-bold ${c.split(' ')[0]}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function ClientDashboard() {
  const [orders, setOrders] = useState([]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadOrders();
    connectSocket();
    socket.on('stop_updated', ({ stop }) => {
      if (stop?.status === 'COMPLETED') {
        setNotification({ msg: `✅ Вашата заявка на ${stop.address} е изпълнена!`, type: 'success' });
        loadOrders();
        setTimeout(() => setNotification(null), 6000);
      }
    });
    return () => { socket.off('stop_updated'); };
  }, []);

  async function loadOrders() {
    try { setOrders(await api.get('/orders')); } catch { setOrders(MOCK_ORDERS); }
  }

  async function markFull(orderId) {
    try {
      await api.patch(`/orders/${orderId}/container-full`, {});
      await loadOrders();
      setNotification({ msg: '📦 Известихме ни! Ще насрочим вземането скоро.', type: 'success' });
      setTimeout(() => setNotification(null), 5000);
    } catch (e) { alert(e.message); }
  }

  const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const completed = orders.filter(o => o.status === 'COMPLETED');
  const awaitingFill = active.filter(o => o.status === 'AWAITING_FILL');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Моето табло</h1>
          <p className="text-slate-500 text-sm mt-0.5">Управление на вашите заявки</p>
        </div>
        <Link to="/client/new-order"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Нова заявка
        </Link>
      </div>

      {notification && (
        <div className={`rounded-xl p-4 text-sm font-medium border ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Активни заявки" value={active.length} icon={Clock} color="blue" />
        <StatCard label="Завършени" value={completed.length} icon={CheckCircle} color="green" />
        <StatCard label="Чакат пълнене" value={awaitingFill.length} icon={Package} color="amber" />
        <StatCard label="Общо заявки" value={orders.length} icon={AlertCircle} color="slate" />
      </div>

      {/* Containers awaiting fill — prominent */}
      {awaitingFill.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Контейнери, чакащи вашия сигнал
          </h2>
          <div className="space-y-3">
            {awaitingFill.map(o => (
              <div key={o.id} className="bg-white rounded-lg p-4 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">📦 {o.address}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{o.wasteType} · {o.volumeM3 ? `${o.volumeM3} м³` : ''}</p>
                  <p className="text-xs text-amber-600 mt-1">Когато контейнерът е пълен, натиснете бутона и ще насрочим вземане.</p>
                </div>
                <button onClick={() => markFull(o.id)}
                  className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
                  📦 Пълен е — вземете го!
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active orders */}
      {active.filter(o => o.status !== 'AWAITING_FILL').length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">🚛 Активни заявки</h2>
          <div className="space-y-3">
            {active.filter(o => o.status !== 'AWAITING_FILL').map(order => (
              <div key={order.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <StatusBadge status={order.status} />
                      <StatusBadge type={order.orderType} />
                    </div>
                    <p className="font-medium text-slate-800 truncate">📍 {order.address}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {order.wasteType}
                      {order.volumeM3 && ` · ${order.volumeM3} м³`}
                      {order.estimatedKg && ` · ~${order.estimatedKg} кг`}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">
                    {order.requestedDate ? new Date(order.requestedDate).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' }) : ''}
                  </p>
                </div>

                {order.status === 'IN_TRANSIT' && (
                  <div className="mt-3 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <p className="text-sm font-medium text-yellow-700">Камионът е на път към вас</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && completed.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-medium text-slate-700 mb-1">Нямате активни заявки</p>
          <p className="text-sm text-slate-400 mb-4">Подайте заявка за извозване на отпадъци</p>
          <Link to="/client/new-order"
            className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors">
            <Plus className="w-4 h-4" />
            Нова заявка
          </Link>
        </div>
      )}
    </div>
  );
}

const MOCK_ORDERS = [
  { id: '1', status: 'AWAITING_FILL', orderType: 'CONTAINER', wasteType: 'Строителни', address: 'ул. Борисова 45, Русе', volumeM3: 7, requestedDate: new Date().toISOString() },
  { id: '2', status: 'IN_TRANSIT', orderType: 'GARBAGE_TRUCK', wasteType: 'Смесени', address: 'ж.к. Чародейка, Русе', estimatedKg: 1500, requestedDate: new Date().toISOString() },
  { id: '3', status: 'COMPLETED', orderType: 'CONTAINER', wasteType: 'Инертни', address: 'ул. Хан Аспарух 12, Русе', volumeM3: 4, requestedDate: new Date(Date.now() - 86400000 * 5).toISOString() },
];
