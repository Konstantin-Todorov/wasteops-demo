import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  { icon: '🛣️', title: 'AI оптимизация на маршрути', desc: 'Спестяване до 30% гориво с VRP алгоритъм (nearest-neighbor + 2-opt)' },
  { icon: '📍', title: 'GPS проследяване', desc: 'Реално местоположение на всички камиони в реално време' },
  { icon: '📦', title: 'Управление на контейнери', desc: 'QR/RFID проследимост на всеки контейнер от доставка до вземане' },
  { icon: '📊', title: 'BI анализи', desc: 'Справки за МОСВ и управленски решения базирани на данни' },
  { icon: '🔔', title: 'Клиентски портал', desc: 'Онлайн заявки, tracking на контейнери и фактури на едно място' },
  { icon: '🚛', title: 'Шофьорско приложение', desc: 'PWA за мобилни устройства — работи и без интернет' },
];

const PORTALS = [
  {
    icon: '🖥️',
    title: 'Диспечерски портал',
    desc: 'Управление на заявки, курсове, карта на живо, клиенти и фактури. За администратори и диспечери.',
    color: 'from-slate-700 to-slate-800',
  },
  {
    icon: '🏢',
    title: 'Клиентски портал',
    desc: 'Подаване на заявки за контейнери, проследяване на статус и изтегляне на фактури онлайн.',
    color: 'from-green-700 to-green-800',
  },
  {
    icon: '📱',
    title: 'Шофьорско приложение',
    desc: 'Дневни маршрути, навигация до спирки, отчитане на проблеми и снимки директно от телефона.',
    color: 'from-blue-700 to-blue-800',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #22c55e 0%, transparent 50%), radial-gradient(circle at 80% 20%, #16a34a 0%, transparent 40%)'
        }} />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 mb-8">
            <img src="/logo-dark.png" alt="Logix" className="w-5 h-5" />
            <span className="font-semibold tracking-wide">Logix</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-4 text-white">
            Интелигентна платформа за управление<br className="hidden sm:block" /> на строителни и индустриални отпадъци
          </h1>
          <p className="text-lg sm:text-xl text-white/70 mb-10">
            Русенска и Североизточна България
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login"
              className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold px-8 py-3.5 rounded-xl text-base transition-colors shadow-lg shadow-green-900/30">
              Влез в системата →
            </Link>
            <a href="/guide"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 hover:border-white/60 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-colors">
              Ръководство
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-white/10 bg-black/20">
          <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
            <span>🚛 3 камиона</span>
            <span className="hidden sm:block text-white/20">·</span>
            <span>📍 25+ спирки/ден</span>
            <span className="hidden sm:block text-white/20">·</span>
            <span>⛽ до 30% по-малко гориво</span>
            <span className="hidden sm:block text-white/20">·</span>
            <span>🗺️ Русенска обл.</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">Всичко необходимо за модерно управление</h2>
          <p className="text-slate-500 text-base max-w-xl mx-auto">Платформата обединява оперативното управление, анализите и комуникацията с клиенти в едно решение.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-slate-800 mb-1.5 text-sm">{f.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portals */}
      <section className="bg-slate-50 border-y border-slate-200 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">Три портала, един продукт</h2>
            <p className="text-slate-500 text-base">Всеки потребител вижда само това, от което се нуждае.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {PORTALS.map(p => (
              <div key={p.title} className={`bg-gradient-to-br ${p.color} text-white rounded-2xl p-6 flex flex-col gap-4 shadow-md`}>
                <div className="text-4xl">{p.icon}</div>
                <div>
                  <h3 className="font-bold text-lg mb-2">{p.title}</h3>
                  <p className="text-white/75 text-sm leading-relaxed">{p.desc}</p>
                </div>
                <Link to="/login"
                  className="self-start inline-flex items-center gap-1 text-sm font-semibold text-white/90 hover:text-white border border-white/30 hover:border-white/60 px-4 py-1.5 rounded-lg transition-colors mt-auto">
                  Влез →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-8 text-center text-xs text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/logo.png" alt="Logix" className="w-5 h-5" />
          <span className="font-semibold text-slate-600">Logix</span>
        </div>
        <p>Демо платформа · Русенска и Североизточна България</p>
      </footer>
    </div>
  );
}
