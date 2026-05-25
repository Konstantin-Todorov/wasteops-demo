import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const INPUT_CLS = 'border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full';
const LABEL_CLS = 'block text-sm font-medium text-slate-700 mb-1';

function Field({ label, children }) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      {children}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-base font-bold text-slate-800 pb-2 border-b border-slate-100">{title}</h2>
      {children}
    </div>
  );
}

/* ─── Section 1: Company Data ─────────────────────────── */
function CompanySection() {
  const [form, setForm] = useState({
    name: '', taxId: '', vatId: '', address: '', phone: '', email: '',
    bankName: '', iban: '', invoicePrefix: 'INV', invoiceNextNum: 1,
    fuelPriceDiesel: '', fuelPriceGasoline: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/settings').then(data => {
      if (data) setForm(f => ({ ...f, ...data }));
    }).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.patch('/settings', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <SectionCard title="Данни на фирмата">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Наименование на фирмата">
            <input className={INPUT_CLS} value={form.name || ''} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="ЕИК">
            <input className={INPUT_CLS} value={form.taxId || ''} onChange={e => set('taxId', e.target.value)} />
          </Field>
          <Field label="ДДС №">
            <input className={INPUT_CLS} value={form.vatId || ''} onChange={e => set('vatId', e.target.value)} />
          </Field>
          <Field label="Телефон">
            <input className={INPUT_CLS} type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
          </Field>
          <Field label="Имейл">
            <input className={INPUT_CLS} type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
          </Field>
          <Field label="Адрес">
            <input className={INPUT_CLS} value={form.address || ''} onChange={e => set('address', e.target.value)} />
          </Field>
          <Field label="Банка">
            <input className={INPUT_CLS} value={form.bankName || ''} onChange={e => set('bankName', e.target.value)} />
          </Field>
          <Field label="IBAN">
            <input className={INPUT_CLS} value={form.iban || ''} onChange={e => set('iban', e.target.value)} />
          </Field>
          <Field label="Префикс на фактура">
            <input className={INPUT_CLS} value={form.invoicePrefix || 'INV'} onChange={e => set('invoicePrefix', e.target.value)} placeholder="INV" />
          </Field>
          <Field label="Следващ номер на фактура">
            <input className={INPUT_CLS} type="number" min={1} value={form.invoiceNextNum || 1} onChange={e => set('invoiceNextNum', Number(e.target.value))} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Цени на горивата (€/л)">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-start gap-2">
          <span className="text-amber-500 text-lg flex-shrink-0">⛽</span>
          <div className="text-xs text-amber-800">
            <strong>Актуални цени за гориво в България</strong> — обновявайте ежедневно.{' '}
            <a href="https://fuelo.net/bg" target="_blank" rel="noopener noreferrer"
              className="underline text-amber-700 hover:text-amber-900 font-semibold">
              Провери на fuelo.net →
            </a>{' '}
            (Eurostat не предоставя API с ежедневни данни — цените се въвеждат ръчно).
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Дизел (€/л)">
            <input
              className={INPUT_CLS}
              type="number"
              step="0.001"
              min="0"
              value={form.fuelPriceDiesel || ''}
              onChange={e => set('fuelPriceDiesel', e.target.value)}
              placeholder="1.70"
            />
          </Field>
          <Field label="Бензин (€/л)">
            <input
              className={INPUT_CLS}
              type="number"
              step="0.001"
              min="0"
              value={form.fuelPriceGasoline || ''}
              onChange={e => set('fuelPriceGasoline', e.target.value)}
              placeholder="1.75"
            />
          </Field>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          * Цените са в евро (€) и се използват за изчисляване на спестявания при оптимизирани маршрути.
          България е в еврозоната от 01.01.2025 — 1 EUR = 1.95583 BGN (фиксиран курс).
        </p>
      </SectionCard>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Запазване...' : 'Запази настройки'}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Запазено успешно</span>}
      </div>
    </form>
  );
}

/* ─── Section 3: Drivers ──────────────────────────────── */
function DriversSection() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [rates, setRates] = useState({});

  useEffect(() => {
    api.get('/users?role=DRIVER').then(data => {
      setDrivers(data);
      const r = {};
      data.forEach(d => { r[d.id] = d.hourlyRate ?? ''; });
      setRates(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function saveDriver(id) {
    setSaving(s => ({ ...s, [id]: true }));
    try {
      await api.patch(`/users/${id}`, { hourlyRate: Number(rates[id]) });
      setSaved(s => ({ ...s, [id]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2500);
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  }

  return (
    <SectionCard title="Шофьори — ставки и данни">
      {loading ? (
        <p className="text-slate-400 text-sm">Зареждане...</p>
      ) : drivers.length === 0 ? (
        <p className="text-slate-400 text-sm">Няма регистрирани шофьори.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="pb-2 pr-4 font-medium">Шофьор</th>
                <th className="pb-2 pr-4 font-medium">Имейл</th>
                <th className="pb-2 pr-4 font-medium">Камион (рег. №)</th>
                <th className="pb-2 pr-4 font-medium">Ставка (€/ч)</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-slate-800">{d.name}</td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">{d.email}</td>
                  <td className="py-3 pr-4 text-slate-500 text-xs font-mono">{d.truck?.plate || '—'}</td>
                  <td className="py-3 pr-4">
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={rates[d.id] ?? ''}
                      onChange={e => setRates(r => ({ ...r, [d.id]: e.target.value }))}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-28"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveDriver(d.id)}
                        disabled={saving[d.id]}
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {saving[d.id] ? '...' : 'Запази'}
                      </button>
                      {saved[d.id] && <span className="text-green-600 text-xs">✓</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/* ─── Main AdminSettings page ─────────────────────────── */
export default function AdminSettings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Настройки</h1>
        <p className="text-sm text-slate-500 mt-1">Данни на фирмата, горива и шофьорски ставки</p>
      </div>

      <CompanySection />
      <DriversSection />
    </div>
  );
}
