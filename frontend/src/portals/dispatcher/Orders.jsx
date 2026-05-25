import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const STATUS_LABEL = {
  confirmed: 'Потвърдена', scheduled: 'Насрочена',
  in_progress: 'В изпълнение', completed: 'Завършена', cancelled: 'Отменена', draft: 'Чернова'
};
const STATUS_BADGE = {
  confirmed: 'badge-blue', scheduled: 'badge-yellow',
  in_progress: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red', draft: 'badge-gray'
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders').then(data => { setOrders(data); setLoading(false); });
  }, []);

  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search && !o.address.toLowerCase().includes(search.toLowerCase()) &&
      !o.client?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Заявки</h1>
        <span className="badge-blue">{orders.filter(o => o.status === 'confirmed').length} чакащи</span>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <input className="input max-w-xs" placeholder="Търси по клиент или адрес..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-auto" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Всички статуси</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {loading ? <p className="text-gray-400 text-sm">Зареждане...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">Клиент</th>
                  <th className="pb-2 pr-4 font-medium">Адрес</th>
                  <th className="pb-2 pr-4 font-medium">Тип отпадък</th>
                  <th className="pb-2 pr-4 font-medium">Обем / Тегло</th>
                  <th className="pb-2 pr-4 font-medium">Дата</th>
                  <th className="pb-2 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{order.client?.name}</p>
                      <p className="text-xs text-gray-400">{order.client?.type === 'corporate' ? 'Корпоративен' : 'Физическо лице'}</p>
                    </td>
                    <td className="py-3 pr-4 text-gray-600 max-w-[200px] truncate">{order.address}</td>
                    <td className="py-3 pr-4 text-gray-600">{order.wasteType || '—'}</td>
                    <td className="py-3 pr-4 text-gray-600">{order.volumeM3 ? `${order.volumeM3} м³` : '—'} / {order.estimatedKg ? `${order.estimatedKg} кг` : '—'}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{new Date(order.requestedAt).toLocaleDateString('bg-BG')}</td>
                    <td className="py-3"><span className={STATUS_BADGE[order.status]}>{STATUS_LABEL[order.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Няма намерени заявки</p>}
          </div>
        )}
      </div>
    </div>
  );
}
