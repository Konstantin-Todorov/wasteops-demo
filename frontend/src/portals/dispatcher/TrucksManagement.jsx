import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { RefreshCw, Edit2, X, Plus } from 'lucide-react';

function ExpiryBadge({ label, date }) {
  if (!date) return <span className="text-xs text-slate-400">{label}: —</span>;
  const days = Math.ceil((new Date(date) - new Date()) / 86400000);
  const color = days < 0 ? 'text-red-600 bg-red-50' : days < 30 ? 'text-red-500 bg-red-50' : days < 90 ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50';
  return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}: {new Date(date).toLocaleDateString('bg-BG')} {days < 0 ? '⚠️ ИЗТЕКЛА' : days < 90 ? `(${days}д)` : ''}</span>;
}

const EMPTY_FORM = {
  plate: '', model: '', year: '', capacityM3: '', capacityKg: '',
  fuelType: 'Дизел', fuelL100: '', mileageKm: '',
  gtpDate: '', civilDate: '', vignetteDate: '', vignetteUrl: '',
  notes: '', color: '#64748b', status: 'AVAILABLE', driverId: '',
};

function TruckModal({ truck, drivers, onClose, onSaved }) {
  const isNew = !truck;
  const [form, setForm] = useState(() => truck ? {
    plate: truck.plate || '',
    model: truck.model || '',
    year: truck.year || '',
    capacityM3: truck.capacityM3 || '',
    capacityKg: truck.capacityKg || '',
    fuelType: truck.fuelType || 'Дизел',
    fuelL100: truck.fuelL100 || '',
    mileageKm: truck.mileageKm || '',
    gtpDate: truck.gtpDate ? truck.gtpDate.split('T')[0] : '',
    civilDate: truck.civilDate ? truck.civilDate.split('T')[0] : '',
    vignetteDate: truck.vignetteDate ? truck.vignetteDate.split('T')[0] : '',
    vignetteUrl: truck.vignetteUrl || '',
    notes: truck.notes || '',
    color: truck.color || '#64748b',
    status: truck.status || 'AVAILABLE',
    driverId: truck.driver?.id || '',
  } : { ...EMPTY_FORM });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSave() {
    if (!form.plate.trim()) { setError('Регистрационният номер е задължителен'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      if (payload.year) payload.year = parseInt(payload.year);
      if (payload.capacityM3) payload.capacityM3 = parseFloat(payload.capacityM3);
      if (payload.capacityKg) payload.capacityKg = parseFloat(payload.capacityKg);
      if (payload.fuelL100) payload.fuelL100 = parseFloat(payload.fuelL100);
      if (payload.mileageKm) payload.mileageKm = parseFloat(payload.mileageKm);
      if (!payload.gtpDate) delete payload.gtpDate;
      if (!payload.civilDate) delete payload.civilDate;
      if (!payload.vignetteDate) delete payload.vignetteDate;
      if (!payload.driverId) payload.driverId = null;

      if (isNew) {
        await api.post('/trucks', payload);
      } else {
        await api.patch(`/trucks/${truck.id}`, payload);
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Грешка при запис');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
  const labelClass = "block text-xs font-semibold text-slate-600 mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-bold text-slate-800 text-lg">
            {isNew ? '🚛 Нов автомобил' : `Редактиране: ${truck.plate}`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Регистрационен номер *</label>
              <input name="plate" value={form.plate} onChange={handleChange} className={inputClass} placeholder="Р 1234 АБ" />
            </div>
            <div>
              <label className={labelClass}>Модел</label>
              <input name="model" value={form.model} onChange={handleChange} className={inputClass} placeholder="Mercedes Actros" />
            </div>
            <div>
              <label className={labelClass}>Година</label>
              <input name="year" type="number" value={form.year} onChange={handleChange} className={inputClass} placeholder="2020" />
            </div>
            <div>
              <label className={labelClass}>Шофьор</label>
              <select name="driverId" value={form.driverId} onChange={handleChange} className={inputClass}>
                <option value="">— Без шофьор —</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Вместимост (м³)</label>
              <input name="capacityM3" type="number" step="0.1" value={form.capacityM3} onChange={handleChange} className={inputClass} placeholder="7" />
            </div>
            <div>
              <label className={labelClass}>Товароносимост (кг)</label>
              <input name="capacityKg" type="number" value={form.capacityKg} onChange={handleChange} className={inputClass} placeholder="6000" />
            </div>
            <div>
              <label className={labelClass}>Вид гориво</label>
              <select name="fuelType" value={form.fuelType} onChange={handleChange} className={inputClass}>
                <option>Дизел</option>
                <option>Бензин</option>
                <option>Газ</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Разход (л/100км)</label>
              <input name="fuelL100" type="number" step="0.1" value={form.fuelL100} onChange={handleChange} className={inputClass} placeholder="28" />
            </div>
            <div>
              <label className={labelClass}>Пробег (км)</label>
              <input name="mileageKm" type="number" value={form.mileageKm} onChange={handleChange} className={inputClass} placeholder="150000" />
            </div>
            <div>
              <label className={labelClass}>Статус</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                <option value="AVAILABLE">Активен</option>
                <option value="MAINTENANCE">На сервиз</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>ГТП (технически преглед)</label>
              <input name="gtpDate" type="date" value={form.gtpDate} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Гражданска отговорност</label>
              <input name="civilDate" type="date" value={form.civilDate} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Винетка — валидна до</label>
              <input name="vignetteDate" type="date" value={form.vignetteDate} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Линк за купуване на винетка</label>
              <input name="vignetteUrl" type="text" value={form.vignetteUrl} onChange={handleChange}
                placeholder="https://bgtoll.bg" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Цвят (на картата)</label>
              <div className="flex items-center gap-3">
                <input name="color" type="color" value={form.color} onChange={handleChange}
                  className="h-9 w-16 rounded-lg border border-slate-200 cursor-pointer" />
                <span className="text-xs text-slate-500">{form.color}</span>
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Бележки</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                className={`${inputClass} resize-none`} placeholder="Допълнителна информация..." />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Откажи
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
            {saving ? 'Записване...' : isNew ? '✅ Създай автомобил' : '✅ Запази'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrucksManagement() {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTruck, setModalTruck] = useState(undefined); // undefined=closed, null=new, obj=edit

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [tr, dr] = await Promise.all([
        api.get('/trucks'),
        api.get('/users?role=DRIVER').catch(() => []),
      ]);
      setTrucks(Array.isArray(tr) ? tr : []);
      setDrivers(Array.isArray(dr) ? dr : []);
    } catch { setTrucks([]); }
    finally { setLoading(false); }
  }

  // Count trucks with expiring docs (within 90 days)
  const expiring = trucks.filter(t => {
    const dates = [t.gtpDate, t.civilDate, t.vignetteDate].filter(Boolean);
    return dates.some(d => {
      const days = Math.ceil((new Date(d) - new Date()) / 86400000);
      return days >= 0 && days <= 90;
    });
  }).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Автомобили</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Управление на превозни средства
            {expiring > 0 && (
              <span className="ml-2 text-amber-600 font-medium">⚠️ {expiring} с изтичащи документи</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 bg-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setModalTruck(null)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Нов автомобил
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
        </div>
      ) : trucks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-4">🚛</div>
          <p className="font-semibold text-slate-700 mb-2">Няма регистрирани камиони</p>
          <button onClick={() => setModalTruck(null)}
            className="mt-2 inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors">
            <Plus className="w-4 h-4" /> Добави автомобил
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {trucks.map(truck => (
            <div key={truck.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: truck.color || '#64748b' }} />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-base leading-tight">{truck.plate}</p>
                    <p className="text-sm text-slate-500">{truck.model}{truck.year ? ` · ${truck.year}` : ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalTruck(truck)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-green-700 bg-slate-50 hover:bg-green-50 border border-slate-200 hover:border-green-200 px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0">
                  <Edit2 className="w-3.5 h-3.5" /> Редактирай
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <span>👤</span>
                <span>{truck.driver?.name || <span className="text-slate-400 italic">Без шофьор</span>}</span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                {truck.capacityM3 && (
                  <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                    📦 {truck.capacityM3} м³ / {truck.capacityKg} кг
                  </span>
                )}
                {truck.fuelType && (
                  <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                    ⛽ {truck.fuelType}{truck.fuelL100 ? ` · ${truck.fuelL100} л/100км` : ''}
                  </span>
                )}
                {truck.status === 'MAINTENANCE' && (
                  <span className="bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                    🔧 На сервиз
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                <ExpiryBadge label="ГТП" date={truck.gtpDate} />
                <ExpiryBadge label="Гражданска" date={truck.civilDate} />
                <ExpiryBadge label="Винетка" date={truck.vignetteDate} />
              </div>
            </div>
          ))}
        </div>
      )}

      {modalTruck !== undefined && (
        <TruckModal
          truck={modalTruck}
          drivers={drivers}
          onClose={() => setModalTruck(undefined)}
          onSaved={() => { setModalTruck(undefined); load(); }}
        />
      )}
    </div>
  );
}
