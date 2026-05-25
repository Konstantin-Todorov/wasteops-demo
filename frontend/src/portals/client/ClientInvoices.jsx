import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const STATUS_LABEL = { draft: 'Чернова', sent: 'За плащане', paid: 'Платена', overdue: 'Просрочена' };
const STATUS_BADGE = { draft: 'badge-gray', sent: 'badge-yellow', paid: 'badge-green', overdue: 'badge-red' };

export default function ClientInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [paying, setPaying] = useState(null);
  const [paid, setPaid] = useState(null);

  useEffect(() => { api.get('/invoices').then(setInvoices); }, []);

  async function handlePay(inv) {
    setPaying(inv.id);
    await new Promise(r => setTimeout(r, 1500));
    await api.patch(`/invoices/${inv.id}/pay`, {});
    setPaid(inv.id);
    const data = await api.get('/invoices');
    setInvoices(data);
    setPaying(null);
  }

  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const unpaid = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Фактури</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center"><p className="text-2xl font-bold text-gray-800">{total.toFixed(2)}€</p><p className="text-sm text-gray-500">Общо</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-orange-600">{unpaid.toFixed(2)}€</p><p className="text-sm text-gray-500">За плащане</p></div>
      </div>

      {paid && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 font-medium">
          ✅ Плащането е успешно обработено! (Симулация — без реална транзакция)
        </div>
      )}

      <div className="space-y-3">
        {invoices.map(inv => (
          <div key={inv.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={STATUS_BADGE[inv.status]}>{STATUS_LABEL[inv.status]}</span>
                  <span className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString('bg-BG')}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{inv.amount.toFixed(2)}€</p>
                <p className="text-sm text-gray-500">Краен срок: {new Date(inv.dueDate).toLocaleDateString('bg-BG')}</p>
                {inv.paidAt && <p className="text-xs text-green-600 mt-1">✓ Платена на {new Date(inv.paidAt).toLocaleDateString('bg-BG')}</p>}
              </div>

              {(inv.status === 'sent' || inv.status === 'overdue') && (
                <button onClick={() => handlePay(inv)} disabled={paying === inv.id}
                  className="btn-primary text-base px-6 py-3">
                  {paying === inv.id ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Обработване...
                    </span>
                  ) : '💳 Плати онлайн'}
                </button>
              )}
            </div>
          </div>
        ))}
        {invoices.length === 0 && <p className="text-gray-400 text-center py-8">Нямате фактури</p>}
      </div>
    </div>
  );
}
