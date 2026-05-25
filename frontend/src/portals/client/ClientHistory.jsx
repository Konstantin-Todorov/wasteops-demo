import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const STATUS_LABEL = { confirmed: 'Потвърдена', scheduled: 'Насрочена', in_progress: 'В изпълнение', completed: 'Завършена', cancelled: 'Отменена' };
const STATUS_BADGE = { confirmed: 'badge-blue', scheduled: 'badge-yellow', in_progress: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red' };

export default function ClientHistory() {
  const [orders, setOrders] = useState([]);

  useEffect(() => { api.get('/orders').then(setOrders); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">История на заявките</h1>

      {orders.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Нямате подадени заявки.</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={STATUS_BADGE[order.status]}>{STATUS_LABEL[order.status]}</span>
                  <span className="text-xs text-gray-400">{new Date(order.requestedAt).toLocaleDateString('bg-BG')}</span>
                </div>
                <p className="font-medium text-gray-800">{order.address}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {order.wasteType} {order.volumeM3 ? `· ${order.volumeM3} м³` : ''} {order.estimatedKg ? `· ${order.estimatedKg} кг` : ''}
                </p>
                {order.notes && <p className="text-xs text-gray-400 mt-1 italic">{order.notes}</p>}
              </div>

              {order.tripStops?.[0] && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Курс</p>
                  <p className="text-sm font-medium">{order.tripStops[0].trip?.truck?.plate || '—'}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
