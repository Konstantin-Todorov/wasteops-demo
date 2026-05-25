import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Save, User, Building2, Phone, Mail, MapPin, FileText, CheckCircle } from 'lucide-react';

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
const LABEL = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide';

function Field({ label, children }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

export default function ClientProfile() {
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await api.get('/clients');
      const c = Array.isArray(data) ? data[0] : data;
      if (c) {
        setClient(c);
        setForm({
          name: c.name || '',
          taxId: c.taxId || '',
          address: c.address || '',
          contactName: c.contactName || '',
          contactPhone: c.contactPhone || '',
          email: c.email || '',
          notes: c.notes || '',
        });
      }
    } catch (err) {
      setError('Грешка при зареждане на профила');
    } finally {
      setLoading(false);
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave(e) {
    e.preventDefault();
    if (!client) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.patch(`/clients/${client.id}`, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Грешка при запис');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20 text-slate-400 text-sm">Зареждане...</div>
  );

  const isCorporate = client?.type === 'CORPORATE';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Моят профил</h1>
        <p className="text-sm text-slate-500 mt-1">Управление на вашите данни</p>
      </div>

      {/* Identity card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 ${isCorporate ? 'bg-blue-500' : 'bg-purple-500'}`}>
            {(client?.name || user?.name || '?').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">{client?.name || user?.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCorporate ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                {isCorporate ? '🏢 Фирма' : '👤 Физическо лице'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Регистриран на {client?.createdAt ? new Date(client.createdAt).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Corporate fields */}
          {isCorporate ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Наименование на фирмата *">
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className={`${INPUT} pl-9`} value={form.name} onChange={e => set('name', e.target.value)} required />
                  </div>
                </Field>
                <Field label="ЕИК / Данъчен номер">
                  <input className={INPUT} value={form.taxId} onChange={e => set('taxId', e.target.value)} placeholder="BG123456789" />
                </Field>
              </div>
              <Field label="Адрес на фирмата">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className={`${INPUT} pl-9`} value={form.address} onChange={e => set('address', e.target.value)} placeholder="гр. Русе, ул. ..." />
                </div>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Лице за контакт">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className={`${INPUT} pl-9`} value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Иван Иванов" />
                  </div>
                </Field>
                <Field label="Телефон за контакт">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className={`${INPUT} pl-9`} type="tel" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+359888..." />
                  </div>
                </Field>
              </div>
              <Field label="Имейл за кореспонденция">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className={`${INPUT} pl-9`} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              </Field>
            </>
          ) : (
            /* Individual client fields */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Имена *">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className={`${INPUT} pl-9`} value={form.name} onChange={e => set('name', e.target.value)} required />
                  </div>
                </Field>
                <Field label="Телефон">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className={`${INPUT} pl-9`} type="tel" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+359888..." />
                  </div>
                </Field>
              </div>
              <Field label="Имейл">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className={`${INPUT} pl-9`} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              </Field>
              <Field label="Адрес (за вземане на контейнери)">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className={`${INPUT} pl-9`} value={form.address} onChange={e => set('address', e.target.value)} placeholder="гр. Русе, ул. ..." />
                </div>
              </Field>
            </>
          )}

          <Field label="Бележки / Допълнителна информация">
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea className={`${INPUT} pl-9 resize-none`} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Специфични изисквания, инструкции за достъп..." />
            </div>
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {saved && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4" />
              Данните са запазени успешно
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
              <Save className="w-4 h-4" />
              {saving ? 'Запазване...' : 'Запази данните'}
            </button>
          </div>
        </form>
      </div>

      {/* Account info (read-only) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Данни за акаунт</p>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between">
            <span className="text-slate-400">Имейл за вход</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Тип акаунт</span>
            <span className="font-medium">{isCorporate ? 'Корпоративен клиент' : 'Физическо лице'}</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">За промяна на парола се свържете с нас.</p>
      </div>
    </div>
  );
}
