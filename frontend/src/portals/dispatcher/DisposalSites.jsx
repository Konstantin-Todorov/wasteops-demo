import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Edit2, X, Plus, Factory, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

const INPUT_CLS = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
const LABEL_CLS = 'block text-xs font-semibold text-slate-600 mb-1';

const WASTE_TYPE_OPTIONS = [
  { key: 'Строителни отпадъци', color: 'bg-amber-100 text-amber-800' },
  { key: 'Метали',              color: 'bg-blue-100 text-blue-800' },
  { key: 'Смесени отпадъци',   color: 'bg-slate-100 text-slate-700' },
  { key: 'Опасни отпадъци',    color: 'bg-red-100 text-red-800' },
  { key: 'Зелени отпадъци',    color: 'bg-green-100 text-green-800' },
  { key: 'Хартия и картон',    color: 'bg-orange-100 text-orange-800' },
];

function wasteTypeColor(type) {
  return WASTE_TYPE_OPTIONS.find(o => o.key === type)?.color ?? 'bg-slate-100 text-slate-600';
}

const EMPTY_FORM = {
  name: '',
  address: '',
  lat: '',
  lng: '',
  radiusM: 300,
  wasteTypes: [],
  active: true,
};

function SiteModal({ site, onClose, onSaved }) {
  const isEdit = !!site;
  const [form, setForm] = useState(() =>
    site
      ? {
          name: site.name || '',
          address: site.address || '',
          lat: site.lat ?? '',
          lng: site.lng ?? '',
          radiusM: site.radiusM ?? 300,
          wasteTypes: site.wasteTypes || [],
          active: site.active !== undefined ? site.active : true,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function toggleWasteType(type) {
    setForm(f => ({
      ...f,
      wasteTypes: f.wasteTypes.includes(type)
        ? f.wasteTypes.filter(t => t !== type)
        : [...f.wasteTypes, type],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        radiusM: parseInt(form.radiusM),
      };
      if (isEdit) {
        await api.patch(`/disposal-sites/${site.id}`, payload);
      } else {
        await api.post('/disposal-sites', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Грешка при запис');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? 'Редактирай депо' : 'Ново депо за отпадъци'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL_CLS}>Наименование *</label>
            <input
              className={INPUT_CLS}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Депо Юг"
              required
            />
          </div>

          <div>
            <label className={LABEL_CLS}>Адрес</label>
            <input
              className={INPUT_CLS}
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="ул. Промишлена 1, Пловдив"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Ширина (lat) *</label>
              <input
                className={INPUT_CLS}
                type="number"
                step="any"
                value={form.lat}
                onChange={e => set('lat', e.target.value)}
                placeholder="42.1354"
                required
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Дължина (lng) *</label>
              <input
                className={INPUT_CLS}
                type="number"
                step="any"
                value={form.lng}
                onChange={e => set('lng', e.target.value)}
                placeholder="24.7453"
                required
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Зона за засичане (метри)</label>
            <input
              className={INPUT_CLS}
              type="number"
              min="50"
              max="5000"
              value={form.radiusM}
              onChange={e => set('radiusM', e.target.value)}
            />
          </div>

          <div>
            <label className={LABEL_CLS}>Видове отпадъци</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {WASTE_TYPE_OPTIONS.map(({ key, color }) => {
                const selected = form.wasteTypes.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleWasteType(key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? `${color} border-transparent ring-2 ring-offset-1 ring-green-500`
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className={LABEL_CLS + ' mb-0'}>Активно</label>
            <button
              type="button"
              onClick={() => set('active', !form.active)}
              className={`transition-colors ${form.active ? 'text-green-600' : 'text-slate-400'}`}
            >
              {form.active
                ? <ToggleRight className="w-7 h-7" />
                : <ToggleLeft className="w-7 h-7" />}
            </button>
            <span className="text-xs text-slate-500">{form.active ? 'Активно' : 'Неактивно'}</span>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              Отказ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Запазване...' : isEdit ? 'Запази промените' : 'Създай депо'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <p className="text-slate-700 text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
          >
            Отказ
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            Потвърди
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DisposalSites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editSite, setEditSite] = useState(null);
  const [confirm, setConfirm] = useState(null); // { site }
  const [actionError, setActionError] = useState('');

  function load() {
    setLoading(true);
    api
      .get('/disposal-sites')
      .then(data => { setSites(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = sites.filter(s => {
    if (filterActive === 'active' && !s.active) return false;
    if (filterActive === 'inactive' && s.active) return false;
    const q = search.toLowerCase();
    if (q && !s.name?.toLowerCase().includes(q) && !s.address?.toLowerCase().includes(q)) return false;
    return true;
  });

  const activeCount = sites.filter(s => s.active).length;
  const inactiveCount = sites.filter(s => !s.active).length;
  const totalTrips = sites.reduce((sum, s) => sum + (s._count?.trips ?? 0), 0);

  async function toggleActive(site) {
    try {
      await api.patch(`/disposal-sites/${site.id}`, { active: !site.active });
      load();
    } catch (err) {
      setActionError(err.message || 'Грешка');
    }
  }

  async function handleDelete(site) {
    setConfirm({ site });
  }

  async function confirmDelete() {
    const site = confirm.site;
    setConfirm(null);
    try {
      await api.delete(`/disposal-sites/${site.id}`);
      load();
    } catch (err) {
      setActionError(err.message || 'Грешка при изтриване');
    }
  }

  return (
    <div className="p-6 flex gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">Депа за отпадъци</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold">
                {sites.length}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Управление на площадки за депониране</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ново депо
          </button>
        </div>

        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 flex items-center justify-between">
            {actionError}
            <button onClick={() => setActionError('')} className="ml-4 text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 max-w-xs w-full"
            placeholder="Търси по название или адрес..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            value={filterActive}
            onChange={e => setFilterActive(e.target.value)}
          >
            <option value="all">Всички</option>
            <option value="active">Само активни</option>
            <option value="inactive">Само неактивни</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-slate-400 text-sm">Зареждане...</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-16">Няма намерени депа</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(site => (
              <div
                key={site.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 transition-all hover:shadow-md ${
                  site.active ? 'border-slate-200' : 'border-slate-100 opacity-70'
                }`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <Factory className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{site.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{site.address || '—'}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                      site.active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {site.active ? 'Активно' : 'Неактивно'}
                  </span>
                </div>

                {/* Waste type tags */}
                {site.wasteTypes?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {site.wasteTypes.map(type => (
                      <span
                        key={type}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${wasteTypeColor(type)}`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    {site.radiusM} м зона
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {site._count?.trips ?? 0} курса
                  </span>
                  <span className="text-slate-400 text-xs ml-auto">
                    {site.lat?.toFixed(4)}, {site.lng?.toFixed(4)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setEditSite(site)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Редактирай
                  </button>
                  <button
                    onClick={() => toggleActive(site)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      site.active
                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                        : 'border-green-200 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {site.active
                      ? <><ToggleLeft className="w-3.5 h-3.5" /> Деактивирай</>
                      : <><ToggleRight className="w-3.5 h-3.5" /> Активирай</>}
                  </button>
                  <button
                    onClick={() => handleDelete(site)}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Изтрий
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="w-60 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Обобщение</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Общо депа</span>
              <span className="text-lg font-bold text-slate-800">{sites.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
                <span className="text-sm text-slate-600">Активни</span>
              </div>
              <span className="text-sm font-semibold text-slate-800">{activeCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span className="text-sm text-slate-600">Неактивни</span>
              </div>
              <span className="text-sm font-semibold text-slate-800">{inactiveCount}</span>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-600">Общо курсове</span>
              <span className="text-lg font-bold text-purple-600">{totalTrips}</span>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-purple-700 mb-1">Зони за засичане</p>
          <p className="text-xs text-purple-600 leading-relaxed">
            Радиусът определя зоната, в която GPS позицията на камиона се счита за пристигане в депото.
          </p>
        </div>

        <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-green-700 mb-2">Бърз достъп</p>
          <button
            onClick={() => setShowCreate(true)}
            className="w-full text-sm text-green-700 hover:text-green-900 font-medium py-2 px-3 rounded-lg hover:bg-green-100 transition-colors text-left"
          >
            + Ново депо
          </button>
        </div>
      </div>

      {showCreate && <SiteModal onClose={() => setShowCreate(false)} onSaved={load} />}
      {editSite && <SiteModal site={editSite} onClose={() => setEditSite(null)} onSaved={load} />}
      {confirm && (
        <ConfirmDialog
          message={`Сигурни ли сте, че искате да изтриете депо "${confirm.site.name}"? Ако има свързани курсове, то ще бъде деактивирано.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
