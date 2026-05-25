import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../lib/api';
import { Package, Truck, MapPin, Calendar, FileText, CreditCard, ChevronRight, CheckCircle, Search, Clock } from 'lucide-react';

const HQ = [43.861917, 26.034763];

const WASTE_TYPES = [
  'Строителни отпадъци',
  'Смесени строителни',
  'Инертни материали',
  'Домашен ремонт',
  'Метални отпадъци',
  'Дървени материали',
  'Индустриални отпадъци',
  'Битови отпадъци',
];

const CONTAINER_SIZES = [
  { volume: 1.1, label: 'Кофа 1.1 м³', desc: 'до 500 кг — офис/дребен ремонт', maxKg: 500 },
  { volume: 4,   label: 'Контейнер 4 м³', desc: 'до 4 000 кг — малки ремонти', maxKg: 4000 },
  { volume: 7,   label: 'Контейнер 7 м³', desc: 'до 7 000 кг — покриви, смесени', maxKg: 7000 },
  { volume: 10,  label: 'Контейнер 10 м³', desc: 'до 10 000 кг — строителни обекти', maxKg: 10000 },
  { volume: 20,  label: 'Ролкер 20 м³', desc: 'до 15 000 кг — едри обекти', maxKg: 15000 },
  { volume: 30,  label: 'Ролкер 30 м³', desc: 'до 20 000 кг — индустриални', maxKg: 20000 },
];

const PAYMENT_METHODS = [
  { value: 'INVOICE', label: 'Фактура', icon: '🧾' },
  { value: 'CASH', label: 'В брой', icon: '💵' },
  { value: 'CARD', label: 'Карта', icon: '💳' },
  { value: 'BANK_TRANSFER', label: 'Банков превод', icon: '🏦' },
];

function MapPicker({ position, onPick }) {
  useMapEvents({
    click(e) { onPick([e.latlng.lat, e.latlng.lng]); }
  });
  return position ? (
    <Marker position={position} icon={L.divIcon({
      html: `<div style="background:#16a34a;border-radius:50%;width:24px;height:24px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
      className: '', iconSize: [24, 24], iconAnchor: [12, 12]
    })} />
  ) : null;
}

function MapFlyTo({ pos }) {
  const map = useMap();
  useEffect(() => { if (pos) map.flyTo(pos, 15, { duration: 1 }); }, [pos]);
  return null;
}

function AddressAutocomplete({ value, onChange, onSelect, recentAddresses }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleInput(val) {
    setQuery(val);
    onChange(val);
    clearTimeout(timerRef.current);
    if (val.length < 3) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&countrycodes=bg&format=json&limit=5&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'bg', 'User-Agent': 'WasteLogix/1.0' } });
        const data = await res.json();
        setSuggestions(data.map(r => ({
          label: r.display_name,
          short: [r.address?.road, r.address?.city || r.address?.town || r.address?.village].filter(Boolean).join(', '),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })));
        setShowDropdown(true);
      } catch { /* silently fail */ }
      setLoading(false);
    }, 400);
  }

  function pick(item) {
    setQuery(item.label);
    onChange(item.label);
    onSelect(item);
    setSuggestions([]);
    setShowDropdown(false);
  }

  const showRecent = showDropdown && query.length < 3 && recentAddresses.length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          required
          placeholder="Потърсете адрес или кликнете на картата..."
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (suggestions.length > 0 || showRecent) && (
        <div className="absolute z-[1000] top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Recent addresses */}
          {showRecent && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 pt-2 pb-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Последно използвани
              </p>
              {recentAddresses.map((addr, i) => (
                <button key={i} type="button"
                  onClick={() => pick({ label: addr.address, short: addr.address, lat: addr.lat, lng: addr.lng })}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{addr.address}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Използван {new Date(addr.createdAt).toLocaleDateString('bg-BG')}</p>
                </button>
              ))}
            </>
          )}

          {/* Nominatim suggestions */}
          {suggestions.length > 0 && (
            <>
              {showRecent && <div className="border-t border-slate-100 my-1" />}
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 pt-1 pb-1">Търсене</p>
              {suggestions.map((s, i) => (
                <button key={i} type="button"
                  onClick={() => pick(s)}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{s.short || s.label}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{s.label}</p>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewOrder() {
  const [step, setStep] = useState(1);
  const [orderType, setOrderType] = useState(null);
  const [form, setForm] = useState({
    address: '',
    lat: '',
    lng: '',
    wasteType: 'Строителни отпадъци',
    estimatedKg: 2000,
    volumeM3: 4,
    notes: '',
    requestedDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    paymentMethod: 'INVOICE',
  });
  const [mapPos, setMapPos] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [recentAddresses, setRecentAddresses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/orders').then(orders => {
      if (!Array.isArray(orders)) return;
      const seen = new Set();
      const recent = orders
        .filter(o => o.address && o.lat && o.lng)
        .filter(o => { if (seen.has(o.address)) return false; seen.add(o.address); return true; })
        .slice(0, 5)
        .map(o => ({ address: o.address, lat: parseFloat(o.lat), lng: parseFloat(o.lng), createdAt: o.createdAt }));
      setRecentAddresses(recent);
    }).catch(() => {});
  }, []);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  function handleMapPick(pos) {
    setMapPos(pos);
    set('lat', pos[0].toFixed(6));
    set('lng', pos[1].toFixed(6));
  }

  function handleAddressSelect({ lat, lng, label }) {
    const pos = [lat, lng];
    setMapPos(pos);
    setFlyTo(pos);
    set('lat', lat.toFixed(6));
    set('lng', lng.toFixed(6));
  }

  function selectType(type) {
    setOrderType(type);
    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.lat || !form.lng) { alert('Изберете местоположение на картата'); return; }
    setSubmitting(true);
    try {
      await api.post('/orders', {
        orderType,
        address: form.address,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        wasteType: form.wasteType,
        estimatedKg: parseInt(form.estimatedKg),
        volumeM3: orderType === 'CONTAINER' ? parseFloat(form.volumeM3) : null,
        notes: form.notes || null,
        requestedDate: new Date(form.requestedDate).toISOString(),
        paymentMethod: form.paymentMethod,
      });
      setSuccess(true);
      setTimeout(() => navigate('/client'), 2000);
    } catch (err) {
      alert(err.message);
      setSubmitting(false);
    }
  }

  if (success) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Заявката е подадена!</h2>
      <p className="text-slate-500">Очаква одобрение от диспечер. Ще получите потвърждение скоро.</p>
      <div className="mt-4 w-32 h-1 bg-green-200 rounded-full overflow-hidden">
        <div className="h-1 bg-green-500 rounded-full animate-pulse w-full" />
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header + breadcrumb */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Нова заявка</h1>
        <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-400">
          <span className={step >= 1 ? 'text-green-600 font-medium' : ''}>1. Вид услуга</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step >= 2 ? 'text-green-600 font-medium' : ''}>2. Детайли</span>
        </div>
      </div>

      {/* Step 1 — type selection */}
      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => selectType('CONTAINER')}
            className="group text-left bg-white rounded-xl border-2 border-slate-200 hover:border-green-500 hover:shadow-md p-6 transition-all">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
              <Package className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">Контейнер</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Доставяме контейнер на вашия обект. Напълвате го когато е готово, след което го вземаме и извозваме.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {['1.1 м³', '4 м³', '7 м³', '10 м³', '20 м³', '30 м³'].map(s => (
                <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{s}</span>
              ))}
            </div>
          </button>

          <button onClick={() => selectType('GARBAGE_TRUCK')}
            className="group text-left bg-white rounded-xl border-2 border-slate-200 hover:border-green-500 hover:shadow-md p-6 transition-all">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
              <Truck className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">Сметовоз</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Камионът идва директно при вас, натоварва отпадъците на място и ги отвозва веднага до депото.
            </p>
            <div className="mt-4">
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">Еднократно посещение</span>
            </div>
          </button>
        </div>
      )}

      {/* Step 2 — details form */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Order type indicator */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${orderType === 'CONTAINER' ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'}`}>
            {orderType === 'CONTAINER'
              ? <Package className="w-5 h-5 text-indigo-600" />
              : <Truck className="w-5 h-5 text-amber-600" />}
            <div className="flex-1">
              <p className={`font-semibold text-sm ${orderType === 'CONTAINER' ? 'text-indigo-700' : 'text-amber-700'}`}>
                {orderType === 'CONTAINER' ? 'Заявка за контейнер' : 'Заявка за сметовоз'}
              </p>
            </div>
            <button type="button" onClick={() => { setStep(1); setOrderType(null); }}
              className="text-xs text-slate-500 hover:text-slate-700 underline">
              Смени
            </button>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              Местоположение
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Адрес / описание на обекта</label>
              <AddressAutocomplete
                value={form.address}
                onChange={val => set('address', val)}
                onSelect={handleAddressSelect}
                recentAddresses={recentAddresses}
              />
              <p className="text-xs text-slate-400 mt-1.5">Или кликнете директно на картата за прецизно маркиране</p>
            </div>

            <div style={{ height: 260 }} className="rounded-lg overflow-hidden border border-slate-200">
              <MapContainer center={HQ} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                <MapPicker position={mapPos} onPick={handleMapPick} />
                <MapFlyTo pos={flyTo} />
              </MapContainer>
            </div>

            {mapPos && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Маркирано: {parseFloat(form.lat).toFixed(5)}, {parseFloat(form.lng).toFixed(5)}
              </p>
            )}
          </div>

          {/* Waste details */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              Отпадък и обем
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Вид отпадък</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.wasteType}
                onChange={e => set('wasteType', e.target.value)}>
                {WASTE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {orderType === 'CONTAINER' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Размер на контейнера</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CONTAINER_SIZES.map(s => (
                    <button key={s.volume} type="button"
                      onClick={() => { set('volumeM3', s.volume); set('estimatedKg', s.maxKg); }}
                      className={`text-left p-3 rounded-lg border-2 transition-all text-sm ${form.volumeM3 === s.volume ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <p className="font-semibold text-slate-800">{s.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {orderType === 'GARBAGE_TRUCK' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Приблизително тегло (кг)</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={form.estimatedKg}
                  onChange={e => set('estimatedKg', e.target.value)}>
                  <option value={500}>до 500 кг</option>
                  <option value={1000}>до 1 000 кг</option>
                  <option value={2000}>до 2 000 кг</option>
                  <option value={5000}>до 5 000 кг</option>
                  <option value={8000}>до 8 000 кг</option>
                  <option value={12000}>до 12 000 кг</option>
                </select>
              </div>
            )}
          </div>

          {/* Scheduling */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Дата и допълнително
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Желана дата</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.requestedDate}
                onChange={e => set('requestedDate', e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Бележки (незадължително)</span>
              </label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                rows={3}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Достъп, работно време, специфики за обекта..."
              />
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              Начин на плащане
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.value} type="button"
                  onClick={() => set('paymentMethod', pm.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-sm ${form.paymentMethod === pm.value ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className="text-xl">{pm.icon}</span>
                  <span className="font-medium text-slate-700 text-xs">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !form.address || !mapPos}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-base transition-colors shadow-sm">
            {submitting ? 'Подаване...' : '✅ Подай заявка за одобрение'}
          </button>
          <p className="text-center text-xs text-slate-400">Заявката ще бъде разгледана от диспечер в рамките на работния ден</p>
        </form>
      )}
    </div>
  );
}
