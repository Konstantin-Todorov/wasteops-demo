import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';

const STATUS_LABEL = {
 DRAFT: 'Чернова',
 SENT: 'Изпратена',
 PAID: 'Платена',
 OVERDUE: 'Просрочена',
 CANCELLED: 'Анулирана',
};

const STATUS_CLS = {
 DRAFT: 'bg-sunken text-ink-2',
 SENT: 'bg-blue-100 text-info',
 PAID: 'bg-brand-soft text-brand',
 OVERDUE: 'bg-danger-soft text-danger',
 CANCELLED: 'bg-slate-200 text-ink-2',
};

function StatusBadge({ status }) {
 return (
 <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_CLS[status] || STATUS_CLS.DRAFT}`}>
 {STATUS_LABEL[status] || status}
 </span>
 );
}

function KpiCard({ value, label, color = 'text-ink' }) {
 return (
 <div className="bg-surface rounded-2xl border border-line shadow-sm p-5"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-sm text-ink-2 mt-1">{label}</p></div>
 );
}

/* ─── Invoice Detail Modal ──────────────────────────────── */
function InvoiceDetailModal({ invoiceId, onClose, onUpdated }) {
 const [inv, setInv] = useState(null);
 const [notes, setNotes] = useState('');
 const [saving, setSaving] = useState(false);
 const notesTimer = useRef(null);

 useEffect(() => {
 api.get(`/invoices/${invoiceId}`).then(data => { setInv(data); setNotes(data.notes || ''); });
 }, [invoiceId]);

 async function changeStatus(status) {
 setSaving(true);
 try {
 await api.patch(`/invoices/${invoiceId}`, { status });
 const updated = await api.get(`/invoices/${invoiceId}`);
 setInv(updated);
 onUpdated();
 } finally {
 setSaving(false);
 }
 }

 function handleNotesChange(val) {
 setNotes(val);
 clearTimeout(notesTimer.current);
 notesTimer.current = setTimeout(async () => {
 await api.patch(`/invoices/${invoiceId}`, { notes: val });
 onUpdated();
 }, 800);
 }

 if (!inv) {
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-surface rounded-2xl p-8 text-ink-3 text-sm">Зареждане...</div></div>
 );
 }

 const subtotal = inv.totalAmount ? inv.totalAmount / 1.2 : 0;
 const vat = inv.totalAmount ? inv.totalAmount - subtotal : 0;

 const items = (() => {
 if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) return inv.items;
 if (inv.order) {
 return [
 {
 description: `Услуга: ${inv.order.wasteType || 'Изхвърляне на отпадъци'}${inv.order.volumeM3 ? ` — ${inv.order.volumeM3} м³` : ''}`,
 qty: 1,
 price: subtotal,
 },
 ];
 }
 return [];
 })();

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:p-0 print:bg-surface"><div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto print:shadow-none print:max-h-none print:rounded-none"><div className="flex items-center justify-between px-6 py-4 border-b border-line print:hidden"><h2 className="text-lg font-bold text-ink">Фактура {inv.invoiceNumber}</h2><button onClick={onClose} className="text-ink-3 hover:text-ink-2 text-2xl leading-none">&times;</button></div><div className="px-6 py-5 space-y-6 print-invoice">
 {/* Invoice header */}
 <div className="flex items-start justify-between"><div><p className="text-2xl font-bold text-ink">{inv.invoiceNumber}</p><p className="text-sm text-ink-2 mt-1">
 {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('bg-BG') : '—'}
 </p></div><StatusBadge status={inv.status} /></div>

 {/* Client block */}
 {inv.client && (
 <div className="bg-raised rounded-xl p-4"><p className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-2">Клиент</p><p className="font-semibold text-ink">{inv.client.name}</p>
 {inv.client.address && <p className="text-sm text-ink-2">{inv.client.address}</p>}
 {inv.client.taxId && <p className="text-xs text-ink-3">ЕИК: {inv.client.taxId}</p>}
 </div>
 )}

 {/* Order details */}
 {inv.order && (
 <div className="bg-info-soft rounded-xl p-4"><p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">Заявка</p><p className="text-sm text-ink">{inv.order.address}</p>
 {inv.order.wasteType && <p className="text-xs text-ink-2 mt-1">Тип отпадък: {inv.order.wasteType}</p>}
 {inv.order.volumeM3 && <p className="text-xs text-ink-2">Обем: {inv.order.volumeM3} м³</p>}
 </div>
 )}

 {/* Line items */}
 <div><table className="w-full text-sm"><thead><tr className="border-b border-line text-ink-2"><th className="pb-2 text-left font-medium">Описание</th><th className="pb-2 text-right font-medium w-16">Бр.</th><th className="pb-2 text-right font-medium w-24">Цена</th><th className="pb-2 text-right font-medium w-24">Сума</th></tr></thead><tbody>
 {items.map((item, i) => (
 <tr key={i} className="border-b border-line"><td className="py-2 text-ink">{item.description}</td><td className="py-2 text-right text-ink-2">{item.qty ?? 1}</td><td className="py-2 text-right text-ink-2">{Number(item.price).toFixed(2)}€</td><td className="py-2 text-right font-medium">{(Number(item.price) * (item.qty ?? 1)).toFixed(2)}€</td></tr>
 ))}
 </tbody></table><div className="mt-3 space-y-1 text-sm text-right"><div className="flex justify-end gap-6 text-ink-2"><span>Нетна стойност:</span><span className="w-28 text-right">{subtotal.toFixed(2)}€</span></div><div className="flex justify-end gap-6 text-ink-2"><span>ДДС (20%):</span><span className="w-28 text-right">{vat.toFixed(2)}€</span></div><div className="flex justify-end gap-6 font-bold text-ink text-base border-t border-line pt-2 mt-1"><span>Общо:</span><span className="w-28 text-right">{Number(inv.totalAmount || 0).toFixed(2)}€</span></div></div></div>

 {/* Notes */}
 <div><label className="block text-sm font-medium text-ink mb-1">Бележки</label><textarea
 className="border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand w-full"
 rows={3}
 value={notes}
 onChange={e => handleNotesChange(e.target.value)}
 placeholder="Добавете бележки към фактурата..."
 /></div>

 {/* Actions */}
 <div className="flex flex-wrap items-center gap-3 pt-2 print:hidden">
 {inv.status === 'DRAFT' && (
 <button
 onClick={() => changeStatus('SENT')}
 disabled={saving}
 className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
 >
 Изпрати
 </button>
 )}
 {inv.status === 'SENT' && (
 <button
 onClick={() => changeStatus('PAID')}
 disabled={saving}
 className="px-4 py-2 rounded-lg bg-brand text-brand-ink text-sm font-medium hover:bg-brand-strong disabled:opacity-50"
 >
 Маркирай платена
 </button>
 )}
 <button
 onClick={() => window.print()}
 className="px-4 py-2 rounded-lg border border-line text-ink-2 text-sm hover:bg-raised"
 >
 Принтирай
 </button></div></div></div></div>
 );
}

/* ─── Generate Proforma Modal ───────────────────────────── */
function GenerateProformaModal({ onClose, onGenerated }) {
 const [orders, setOrders] = useState([]);
 const [selectedOrder, setSelectedOrder] = useState('');
 const [result, setResult] = useState(null);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');

 useEffect(() => {
 api.get('/orders?status=COMPLETED&noInvoice=true').then(setOrders).catch(() =>
 api.get('/orders').then(data => setOrders(data.filter(o => o.status === 'COMPLETED')))
 );
 }, []);

 async function handleGenerate() {
 if (!selectedOrder) return;
 setSaving(true);
 setError('');
 try {
 const inv = await api.post(`/invoices/generate/${selectedOrder}`, {});
 setResult(inv);
 onGenerated();
 } catch (err) {
 setError(err.message);
 } finally {
 setSaving(false);
 }
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md"><div className="flex items-center justify-between px-6 py-4 border-b border-line"><h2 className="text-lg font-bold text-ink">Генерирай проформа</h2><button onClick={onClose} className="text-ink-3 hover:text-ink-2 text-2xl leading-none">&times;</button></div><div className="px-6 py-5 space-y-4">
 {result ? (
 <div className="text-center space-y-3 py-4"><div className="text-4xl"></div><p className="font-bold text-ink">Проформа създадена!</p><p className="text-brand font-semibold text-lg">{result.invoiceNumber}</p><button onClick={onClose} className="mt-4 px-5 py-2 rounded-lg bg-brand text-brand-ink text-sm font-medium hover:bg-brand-strong">
 Затвори
 </button></div>
 ) : (
 <><div><label className="block text-sm font-medium text-ink mb-1">Изберете завършена заявка</label><select
 className="border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand w-full bg-surface"
 value={selectedOrder}
 onChange={e => setSelectedOrder(e.target.value)}
 ><option value="">— Изберете заявка —</option>
 {orders.map(o => (
 <option key={o.id} value={o.id}>
 {o.client?.name} · {o.address} · {new Date(o.requestedAt).toLocaleDateString('bg-BG')}
 </option>
 ))}
 </select>
 {orders.length === 0 && <p className="text-xs text-ink-3 mt-1">Няма завършени заявки без фактура.</p>}
 </div>

 {error && <p className="text-danger text-sm">{error}</p>}

 <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-line text-sm text-ink-2 hover:bg-raised">
 Отказ
 </button><button
 onClick={handleGenerate}
 disabled={!selectedOrder || saving}
 className="px-5 py-2 rounded-lg bg-brand text-brand-ink text-sm font-medium hover:bg-brand-strong disabled:opacity-50"
 >
 {saving ? 'Генериране...' : 'Генерирай'}
 </button></div></>
 )}
 </div></div></div>
 );
}

/* ─── Main Invoices page ────────────────────────────────── */
export default function Invoices() {
 const [invoices, setInvoices] = useState([]);
 const [loading, setLoading] = useState(true);
 const [detailId, setDetailId] = useState(null);
 const [showProforma, setShowProforma] = useState(false);

 function load() {
 api.get('/invoices').then(data => { setInvoices(data); setLoading(false); }).catch(() => setLoading(false));
 }

 useEffect(() => { load(); }, []);

 const totalAmount = invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
 const paidCount = invoices.filter(i => i.status === 'PAID').length;
 const paidAmount = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.totalAmount || 0), 0);
 const unpaidAmount = totalAmount - paidAmount;

 return (
 <div className="p-6 space-y-6">
 {/* Header */}
 <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-ink">Фактури</h1><p className="text-sm text-ink-2 mt-1">Управление на фактури и проформи</p></div><button
 onClick={() => setShowProforma(true)}
 className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-ink text-sm font-medium hover:bg-brand-strong transition-colors"
 ><span className="text-lg leading-none">+</span> Генерирай проформа
 </button></div>

 {/* KPI cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><KpiCard value={invoices.length} label="Общо фактури" /><KpiCard value={paidCount} label="Платени" color="text-brand" /><KpiCard value={`${totalAmount.toFixed(2)}€`} label="Общ оборот" color="text-info" /><KpiCard value={`${unpaidAmount.toFixed(2)}€`} label="Неплатено" color="text-orange-600" /></div>

 {/* Table */}
 <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
 {loading ? (
 <p className="text-ink-3 text-sm p-8 text-center">Зареждане...</p>
 ) : invoices.length === 0 ? (
 <p className="text-ink-3 text-sm p-8 text-center">Няма фактури</p>
 ) : (
 <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-ink-2 border-b border-line bg-raised"><th className="py-3 px-4 font-medium">№</th><th className="py-3 px-4 font-medium">Клиент</th><th className="py-3 px-4 font-medium">Заявка</th><th className="py-3 px-4 font-medium">Сума (с ДДС)</th><th className="py-3 px-4 font-medium">Падеж</th><th className="py-3 px-4 font-medium">Статус</th><th className="py-3 px-4 font-medium">Действия</th></tr></thead><tbody className="divide-y divide-line">
 {invoices.map(inv => (
 <tr
 key={inv.id}
 onClick={() => setDetailId(inv.id)}
 className="hover:bg-raised transition-colors cursor-pointer"
 ><td className="py-3 px-4 font-mono text-ink-2 text-xs">{inv.invoiceNumber}</td><td className="py-3 px-4 font-medium text-ink">{inv.client?.name || '—'}</td><td className="py-3 px-4 text-ink-2 text-xs max-w-[180px] truncate">{inv.order?.address || '—'}</td><td className="py-3 px-4 font-bold text-ink">{Number(inv.totalAmount || 0).toFixed(2)}€</td><td className="py-3 px-4 text-ink-2 text-xs">
 {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('bg-BG') : '—'}
 </td><td className="py-3 px-4"><StatusBadge status={inv.status} /></td><td className="py-3 px-4" onClick={e => e.stopPropagation()}><button
 onClick={() => setDetailId(inv.id)}
 className="text-xs px-3 py-1.5 rounded-lg border border-line text-ink-2 hover:bg-sunken"
 >
 Детайли
 </button></td></tr>
 ))}
 </tbody></table></div>
 )}
 </div>

 {detailId && (
 <InvoiceDetailModal
 invoiceId={detailId}
 onClose={() => setDetailId(null)}
 onUpdated={load}
 />
 )}
 {showProforma && (
 <GenerateProformaModal
 onClose={() => setShowProforma(false)}
 onGenerated={load}
 />
 )}
 </div>
 );
}
