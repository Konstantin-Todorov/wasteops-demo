import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../lib/api';

const DEMO_QR_CODES = [
  'WO-CON-001', 'WO-CON-002', 'WO-CON-003', 'WO-CON-004', 'WO-CON-005'
];

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [container, setContainer] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  async function startCamera() {
    setError('');
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError('Достъпът до камерата е отказан. Използвайте демо QR кодовете.');
      setScanning(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => () => stopCamera(), []);

  async function lookupQR(code) {
    setResult(code);
    setContainer(null);
    try {
      const data = await api.get(`/containers/qr/${code}`);
      setContainer(data);
    } catch {
      setContainer(null);
    }
  }

  async function simulateScan(code) {
    stopCamera();
    await lookupQR(code);
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">QR Сканиране</h2>
      <p className="text-sm text-gray-500">Сканирайте QR кода на контейнера за потвърждение на обслужване</p>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>}

      {!scanning && !result && (
        <button onClick={startCamera} className="btn-primary w-full justify-center py-4 text-base">
          📷 Стартирай камера
        </button>
      )}

      {scanning && (
        <div className="space-y-3">
          <div className="relative bg-black rounded-xl overflow-hidden" style={{ paddingBottom: '75%' }}>
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white rounded-lg opacity-60"></div>
            </div>
          </div>
          <button onClick={stopCamera} className="btn-secondary w-full justify-center">Спри камерата</button>
        </div>
      )}

      {/* Demo QR codes */}
      <div className="card">
        <p className="text-sm font-medium text-gray-700 mb-3">🔲 Демо QR кодове (симулация)</p>
        <div className="grid grid-cols-1 gap-2">
          {DEMO_QR_CODES.map(code => (
            <button key={code} onClick={() => simulateScan(code)}
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-green-50 hover:text-green-700 rounded-xl text-sm transition-colors text-left">
              <span className="text-2xl">▦</span>
              <div>
                <p className="font-mono font-bold">{code}</p>
                <p className="text-xs text-gray-400">Кликни за симулиране на сканиране</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className={`rounded-xl p-4 border ${container ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <p className="text-xs font-medium text-gray-500 mb-2">СКАНИРАН КОД</p>
          <p className="font-mono font-bold text-lg">{result}</p>

          {container ? (
            <div className="mt-3 space-y-1">
              <p className="font-semibold text-green-800">{container.containerType?.name}</p>
              <p className="text-sm text-green-700">📦 {container.containerType?.volumeM3} м³ · до {container.containerType?.maxWeightKg?.toLocaleString()} кг</p>
              {container.client && <p className="text-sm text-green-700">👤 {container.client.name}</p>}
              {container.address && <p className="text-sm text-gray-500">📍 {container.address}</p>}
              <div className="mt-3 p-3 bg-green-100 rounded-lg">
                <p className="text-green-800 font-medium text-sm">✅ Контейнерът е идентифициран успешно!</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
              <p className="text-yellow-800 text-sm">⚠️ Контейнерът не е намерен в системата. Свържете се с диспечера.</p>
            </div>
          )}

          <button onClick={() => { setResult(null); setContainer(null); }} className="btn-secondary w-full mt-3">Ново сканиране</button>
        </div>
      )}
    </div>
  );
}
