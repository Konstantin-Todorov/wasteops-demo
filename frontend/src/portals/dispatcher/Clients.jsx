import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Building2, User } from 'lucide-react';

const INPUT_CLS = 'border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand w-full';
const LABEL_CLS = 'block text-sm font-medium text-ink mb-1';

function Field({ label, children }) {
 return (
 <div><label className={LABEL_CLS}>{label}</label>
 {children}
 </div>
 );
}

function ClientModal({ client, onClose, onSaved }) {
 const isEdit = !!client;
 const [form, setForm] = useState(
 client || { type: 'CORPORATE', name: '', taxId: '', address: '', contactName: '', contactPhone: '', email: '', notes: '' }
 );
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');

 const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

 async function handleSubmit(e) {
 e.preventDefault();
 setSaving(true);
 setError('');
 try {
 if (isEdit) {
 await api.patch(`/clients/${client.id}`, form);
 } else {
 await api.post('/clients', form);
 }
 onSaved();
 onClose();
 } catch (err) {
 setError(err.message);
 } finally {
 setSaving(false);
 }
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between px-6 py-4 border-b border-line"><h2 className="text-lg font-bold text-ink">{isEdit ? 'Редактирай клиент' : 'Нов клиент'}</h2><button onClick={onClose} className="text-ink-3 hover:text-ink-2 text-2xl leading-none">&times;</button></div><form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
 {/* Type toggle */}
 <div><label className={LABEL_CLS}>Тип клиент</label><div className="flex rounded-lg border border-line overflow-hidden w-fit">
 {['CORPORATE', 'INDIVIDUAL'].map(t => (
 <button
 key={t}
 type="button"
 onClick={() => set('type', t)}
 className={`px-5 py-2 text-sm font-medium transition-colors ${
 form.type === t ? 'bg-brand text-brand-ink' : 'bg-surface text-ink-2 hover:bg-raised'
 }`}
 >
 {t === 'CORPORATE' ? 'Фирма' : 'Физическо лице'}
 </button>
 ))}
 </div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Наименование / Имена *"><input className={INPUT_CLS} value={form.name} onChange={e => set('name', e.target.value)} required /></Field>
 {form.type === 'CORPORATE' && (
 <Field label="ЕИК / Данъчен номер"><input className={INPUT_CLS} value={form.taxId || ''} onChange={e => set('taxId', e.target.value)} /></Field>
 )}
 <Field label="Адрес"><input className={INPUT_CLS} value={form.address || ''} onChange={e => set('address', e.target.value)} /></Field><Field label="Лице за контакт"><input className={INPUT_CLS} value={form.contactName || ''} onChange={e => set('contactName', e.target.value)} /></Field><Field label="Телефон"><input className={INPUT_CLS} type="tel" value={form.contactPhone || ''} onChange={e => set('contactPhone', e.target.value)} /></Field><Field label="Имейл"><input className={INPUT_CLS} type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} /></Field></div><Field label="Бележки"><textarea className={INPUT_CLS} rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></Field>

 {error && <p className="text-danger text-sm">{error}</p>}

 <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-line text-sm text-ink-2 hover:bg-raised">
 Отказ
 </button><button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-brand text-brand-ink text-sm font-medium hover:bg-brand-strong disabled:opacity-50">
 {saving ? 'Запазване...' : isEdit ? 'Запази' : 'Създай клиент'}
 </button></div></form></div></div>
 );
}

function ClientStats({ clients, corporate, individual, totalOrders, onAddClient }) {
 return (
 <div className="space-y-4"><div className="bg-surface rounded-2xl border border-line shadow-sm p-5"><p className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-4">Обобщение</p><div className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm text-ink-2">Всички клиенти</span><span className="text-lg font-bold text-ink">{clients.length}</span></div><div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /><span className="text-sm text-ink-2">Фирми</span></div><span className="text-sm font-semibold text-ink">{corporate.length}</span></div><div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /><span className="text-sm text-ink-2">Физически лица</span></div><span className="text-sm font-semibold text-ink">{individual.length}</span></div><div className="pt-3 border-t border-line flex items-center justify-between"><span className="text-sm text-ink-2">Общо заявки</span><span className="text-lg font-bold text-brand">{totalOrders}</span></div></div></div>
 {clients.length > 0 && (
 <div className="bg-surface rounded-2xl border border-line shadow-sm p-5"><p className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-3">Разпределение</p><div className="flex h-3 rounded-full overflow-hidden mb-2"><div className="bg-blue-400 transition-all" style={{ width: `${Math.round(corporate.length / clients.length * 100)}%` }} /><div className="bg-purple-400 flex-1" /></div><div className="flex justify-between text-xs text-ink-3"><span>{Math.round(corporate.length / clients.length * 100)}% фирми</span><span>{Math.round(individual.length / clients.length * 100)}% лица</span></div></div>
 )}
 <div className="bg-brand-soft border border-green-100 rounded-2xl p-5"><p className="text-xs font-semibold text-brand mb-2">Бърз достъп</p><button onClick={onAddClient}
 className="w-full text-sm text-brand hover:text-green-900 font-medium py-2 px-3 rounded-lg hover:bg-brand-soft transition-colors text-left">
 + Нов клиент
 </button></div></div>
 );
}

export default function Clients() {
 const [clients, setClients] = useState([]);
 const [search, setSearch] = useState('');
 const [filter, setFilter] = useState('all');
 const [loading, setLoading] = useState(true);
 const [showCreate, setShowCreate] = useState(false);
 const [editClient, setEditClient] = useState(null);
 const [showStats, setShowStats] = useState(false);

 function load() {
 setLoading(true);
 api.get('/clients').then(data => { setClients(data); setLoading(false); }).catch(() => setLoading(false));
 }

 useEffect(() => { load(); }, []);

 const filtered = clients.filter(c => {
 if (filter !== 'all' && c.type !== filter) return false;
 const q = search.toLowerCase();
 if (q && !c.name?.toLowerCase().includes(q) && !c.address?.toLowerCase().includes(q)) return false;
 return true;
 });

 const corporate = clients.filter(c => c.type === 'CORPORATE');
 const individual = clients.filter(c => c.type === 'INDIVIDUAL');
 const totalOrders = clients.reduce((s, c) => s + (c._count?.orders ?? 0), 0);

 return (
 <div className="p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
 {/* Main content */}
 <div className="flex-1 min-w-0 space-y-4 lg:space-y-5">
 {/* Header */}
 <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl lg:text-2xl font-bold text-ink">Клиенти</h1><p className="text-sm text-ink-2 mt-0.5">Управление на клиентска база</p></div><div className="flex gap-2"><button
 onClick={() => setShowStats(v => !v)}
 className="lg:hidden flex items-center gap-1.5 px-3 py-2 border border-line rounded-lg text-xs text-ink-2 hover:bg-raised bg-surface transition-colors"
 >
 Статс
 </button><button
 onClick={() => setShowCreate(true)}
 className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-brand-ink text-sm font-medium hover:bg-brand-strong transition-colors"
 ><span className="text-lg leading-none">+</span><span className="hidden sm:inline">Нов клиент</span></button></div></div>

 {/* Mobile stats panel */}
 {showStats && (
 <div className="lg:hidden"><ClientStats clients={clients} corporate={corporate} individual={individual} totalOrders={totalOrders} onAddClient={() => setShowCreate(true)} /></div>
 )}

 {/* Filters */}
 <div className="flex flex-wrap gap-3"><input
 className="border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand max-w-xs w-full"
 placeholder="Търси по клиент или адрес..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 /><select
 className="border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface"
 value={filter}
 onChange={e => setFilter(e.target.value)}
 ><option value="all">Всички типове</option><option value="CORPORATE">Корпоративни</option><option value="INDIVIDUAL">Физически лица</option></select></div>

 {/* Grid */}
 {loading ? (
 <p className="text-ink-3 text-sm">Зареждане...</p>
 ) : filtered.length === 0 ? (
 <p className="text-ink-3 text-sm text-center py-12">Няма намерени клиенти</p>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
 {filtered.map(client => (
 <div
 key={client.id}
 className="bg-surface rounded-2xl border border-line shadow-sm p-5 hover:shadow-md transition-all flex flex-col gap-3"
 ><div className="flex items-start gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${client.type === 'CORPORATE' ? 'bg-info-soft' : 'bg-purple-50'}`}>
 {client.type === 'CORPORATE'
                  ? <Building2 size={18} strokeWidth={2} className="text-info" />
                  : <User size={18} strokeWidth={2} className="text-purple-600" />}
 </div><div className="min-w-0 flex-1"><p className="font-semibold text-ink truncate">{client.name}</p><p className="text-xs text-ink-2 mt-0.5 truncate">{client.address || '—'}</p></div><span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${client.type === 'CORPORATE' ? 'bg-blue-100 text-info' : 'bg-purple-100 text-purple-700'}`}>
 {client.type === 'CORPORATE' ? 'Фирма' : 'Лице'}
 </span></div><div className="space-y-1 text-xs text-ink-2">
 {client.contactPhone && <p>{client.contactPhone}</p>}
 {client.email && <p>{client.email}</p>}
 {client.taxId && <p>ЕИК: {client.taxId}</p>}
 </div><div className="flex items-center justify-between pt-2 border-t border-line"><span className="text-xs bg-sunken text-ink-2 px-2 py-1 rounded-full">
 {client._count?.orders ?? 0} заявки
 </span><button
 onClick={() => setEditClient(client)}
 className="text-xs px-3 py-1.5 rounded-lg border border-line text-ink-2 hover:bg-raised transition-colors"
 >
 Редактирай
 </button></div></div>
 ))}
 </div>
 )}
 </div>

 {/* Right sidebar — desktop only */}
 <div className="hidden lg:block lg:w-64 lg:flex-shrink-0 space-y-4"><ClientStats clients={clients} corporate={corporate} individual={individual} totalOrders={totalOrders} onAddClient={() => setShowCreate(true)} /></div>

 {showCreate && <ClientModal onClose={() => setShowCreate(false)} onSaved={load} />}
 {editClient && <ClientModal client={editClient} onClose={() => setEditClient(null)} onSaved={load} />}
 </div>
 );
}
