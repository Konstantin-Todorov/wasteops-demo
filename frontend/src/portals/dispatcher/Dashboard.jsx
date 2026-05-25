import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../lib/api';
import { socket, connectSocket } from '../../lib/socket';

const HQ = [43.861917, 26.034763];
const TRUCK_COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

const STATUS_BG = {
  confirmed: 'badge-blue', scheduled: 'badge-yellow',
  in_progress: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red'
};
const STATUS_LABEL = {
  confirmed: 'Потвърдена', scheduled: 'Насрочена',
  in_progress: 'В изпълнение', completed: 'Завършена', cancelled: 'Отменена'
};

function makeIcon(color, label) {
  return L.divIcon({
    html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${label}</div>`,
    className: '', iconSize: [28, 28], iconAnchor: [14, 14]
  });
}

function makeHQIcon() {
  return L.divIcon({
    html: `<div style="background:#1f2937;color:white;border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🏭</div>`,
    className: '', iconSize: [36, 36], iconAnchor: [18, 18]
  });
}

function TruckIcon({ position, color }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!markerRef.current) {
      const icon = L.divIcon({
        html: `<div style="background:${color};border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🚛</div>`,
        className: '', iconSize: [32, 32], iconAnchor: [16, 16]
      });
      markerRef.current = L.marker(position, { icon }).addTo(map);
    } else {
      markerRef.current.setLatLng(position);
    }
    return () => {};
  }, [position]);

  return null;
}

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [trips, setTrips] = useState([]);
  const [optimized, setOptimized] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trucks, setTrucks] = useState([]);
  const [truckPositions, setTruckPositions] = useState({});
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadData();
    connectSocket();

    socket.on('truck_position', ({ tripId, truckId, truckColor, lat, lng }) => {
      setTruckPositions(prev => ({ ...prev, [truckId]: { lat, lng, color: truckColor } }));
    });
    socket.on('stop_updated', ({ tripId, stop }) => {
      if (stop.status === 'issue_reported') {
        setAlerts(prev => [...prev, { id: Date.now(), tripId, stop, msg: `⚠️ Проблем на ${stop.address}: ${stop.issueNote || 'не е описан'}` }]);
      }
      loadTrips();
    });
    socket.on('simulation_complete', () => {
      setSimulationRunning(false);
      loadData();
    });

    return () => {
      socket.off('truck_position');
      socket.off('stop_updated');
      socket.off('simulation_complete');
    };
  }, []);

  async function loadData() {
    await Promise.all([loadOrders(), loadTrips(), loadTrucks()]);
  }

  async function loadOrders() {
    const data = await api.get('/orders');
    setOrders(data);
  }

  async function loadTrips() {
    const data = await api.get('/trips/today');
    setTrips(data);
  }

  async function loadTrucks() {
    const data = await api.get('/trucks');
    setTrucks(data);
  }

  async function handleOptimize() {
    setOptimizing(true);
    try {
      const result = await api.post('/vrp/optimize', {});
      setOptimized(result);
    } catch (err) {
      alert(err.message);
    } finally {
      setOptimizing(false);
    }
  }

  async function handleSaveRoutes() {
    if (!optimized) return;
    setSaving(true);
    try {
      await api.post('/vrp/save', { routes: optimized.routes, date: new Date().toISOString() });
      setOptimized(null);
      await loadData();
      alert('Маршрутите са запазени успешно!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStartSimulation() {
    const todayTrips = trips.filter(t => t.status === 'planned' || t.status === 'in_progress');
    if (todayTrips.length === 0) {
      alert('Няма курсове за днес. Оптимизирайте и запазете маршрутите първо.');
      return;
    }
    setSimulationRunning(true);
    for (const trip of todayTrips) {
      await api.post(`/simulation/start/${trip.id}`, {});
    }
  }

  async function handleStopSimulation() {
    for (const trip of trips) {
      await api.post(`/simulation/stop/${trip.id}`, {});
    }
    setSimulationRunning(false);
    setTruckPositions({});
  }

  const pendingOrders = orders.filter(o => o.status === 'confirmed');
  const completedToday = orders.filter(o => o.status === 'completed');
  const totalStops = trips.reduce((s, t) => s + t.stops.length, 0);
  const doneStops = trips.reduce((s, t) => s + t.stops.filter(st => st.status === 'completed').length, 0);

  const routeData = optimized || (trips.length > 0 ? buildRoutesFromTrips(trips) : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Диспечерски таблo</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('bg-BG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!simulationRunning ? (
            <>
              {!optimized ? (
                <button onClick={handleOptimize} disabled={optimizing || pendingOrders.length === 0} className="btn-primary">
                  {optimizing ? '⏳ Оптимизиране...' : `✨ Оптимизирай маршрути (${pendingOrders.length})`}
                </button>
              ) : (
                <>
                  <button onClick={handleSaveRoutes} disabled={saving} className="btn-primary">
                    {saving ? 'Запазване...' : '💾 Запази маршрути'}
                  </button>
                  <button onClick={() => setOptimized(null)} className="btn-secondary">✕ Откажи</button>
                </>
              )}
              {trips.length > 0 && !optimized && (
                <button onClick={handleStartSimulation} className="btn bg-purple-600 text-white hover:bg-purple-700">
                  ▶ Стартирай симулация
                </button>
              )}
            </>
          ) : (
            <button onClick={handleStopSimulation} className="btn-danger">
              ⏹ Спри симулацията
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.map(a => (
        <div key={a.id} className="bg-red-50 border border-red-300 rounded-xl p-4 flex justify-between items-start">
          <p className="text-red-700 font-medium">{a.msg}</p>
          <button onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      ))}

      {/* Optimization result */}
      {optimized && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex flex-wrap gap-6 items-center">
            <div><span className="text-2xl font-bold text-green-700">{optimized.totalKm} км</span><p className="text-xs text-gray-500">Общо разстояние</p></div>
            <div><span className="text-2xl font-bold text-green-700">-{optimized.kmSaved} км</span><p className="text-xs text-gray-500">Спестени км</p></div>
            <div><span className="text-2xl font-bold text-green-700">{optimized.savingPercent}%</span><p className="text-xs text-gray-500">По-малко гориво</p></div>
            <div className="flex gap-3 ml-auto flex-wrap">
              {optimized.routes.map((r, i) => (
                <div key={i} className="text-center">
                  <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ background: r.truck.color }}></div>
                  <p className="text-xs font-medium">{r.stops.length} спирки</p>
                  <p className="text-xs text-gray-400">{r.totalKm} км</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-3xl font-bold text-blue-600">{pendingOrders.length}</p>
          <p className="text-sm text-gray-500 mt-1">Чакащи заявки</p>
        </div>
        <div className="card">
          <p className="text-3xl font-bold text-purple-600">{trips.length}</p>
          <p className="text-sm text-gray-500 mt-1">Курса днес</p>
        </div>
        <div className="card">
          <p className="text-3xl font-bold text-green-600">{doneStops}/{totalStops}</p>
          <p className="text-sm text-gray-500 mt-1">Изпълнени спирки</p>
        </div>
        <div className="card">
          <p className="text-3xl font-bold text-orange-600">{completedToday.length}</p>
          <p className="text-sm text-gray-500 mt-1">Завършени услуги</p>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="card p-0 overflow-hidden" style={{ height: 520 }}>
            <MapContainer center={HQ} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>' />

              {/* HQ */}
              <Marker position={HQ} icon={makeHQIcon()}>
                <Popup><strong>База Logix</strong><br />ул. Борисова, Русе</Popup>
              </Marker>

              {/* Routes */}
              {routeData && routeData.routes.map((route, ri) => (
                <React.Fragment key={ri}>
                  {route.geometry && <Polyline positions={route.geometry} color={route.truck?.color || TRUCK_COLORS[ri]} weight={3} opacity={0.7} />}
                  {route.stops.map((stop, si) => (
                    <Marker key={si} position={[stop.lat, stop.lng]}
                      icon={makeIcon(route.truck?.color || TRUCK_COLORS[ri], si + 1)}>
                      <Popup>
                        <strong>Спирка {si + 1}</strong><br />
                        {stop.address}<br />
                        <span className="text-xs text-gray-500">{stop.clientName || stop.order?.client?.name}</span><br />
                        <span className="text-xs">{stop.wasteType || ''}</span>
                      </Popup>
                    </Marker>
                  ))}
                </React.Fragment>
              ))}

              {/* Live truck positions */}
              {Object.entries(truckPositions).map(([id, pos]) => (
                <TruckIcon key={id} position={[pos.lat, pos.lng]} color={pos.color} />
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">🚛 Камиони</h3>
            <div className="space-y-3">
              {trucks.map(truck => {
                const trip = trips.find(t => t.truckId === truck.id);
                const done = trip ? trip.stops.filter(s => s.status === 'completed').length : 0;
                const total = trip ? trip.stops.length : 0;
                return (
                  <div key={truck.id} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: truck.color }}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{truck.plate}</p>
                      <p className="text-xs text-gray-500">{truck.driver?.name || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{done}/{total}</p>
                      <p className="text-xs text-gray-400">спирки</p>
                    </div>
                    {truckPositions[truck.id] && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">📋 Последни заявки</h3>
            <div className="space-y-2">
              {orders.slice(0, 6).map(order => (
                <div key={order.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{order.client?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{order.address}</p>
                  </div>
                  <span className={STATUS_BG[order.status]}>{STATUS_LABEL[order.status]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildRoutesFromTrips(trips) {
  return {
    routes: trips.map(trip => ({
      truck: trip.truck,
      stops: trip.stops.map(s => ({
        lat: s.lat, lng: s.lng, address: s.address,
        clientName: s.order?.client?.name,
        status: s.status
      })),
      geometry: null,
      totalKm: trip.totalKm || 0
    }))
  };
}
