import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, Map, BarChart3, Users, Shield, ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react';

const NAV_SECTIONS = [
  { id: 'overview',   label: 'Преглед' },
  { id: 'processes',  label: 'Процеси' },
  { id: 'roles',      label: 'Роли' },
  { id: 'levels',     label: 'Нива' },
  { id: 'kpis',       label: 'KPI метрики' },
];

function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function FlowStep({ icon, label, desc, color = 'slate', arrow = true }) {
  const colors = {
    green:  'bg-green-50 border-green-200 text-green-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    slate:  'bg-slate-50 border-slate-200 text-slate-700',
  }[color];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className={`flex flex-col items-center border rounded-xl px-3 py-2.5 min-w-[120px] ${colors}`}>
        <span className="text-xl mb-1">{icon}</span>
        <span className="font-semibold text-xs text-center leading-tight">{label}</span>
        {desc && <span className="text-[10px] mt-0.5 opacity-70 text-center">{desc}</span>}
      </div>
      {arrow && <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
    </div>
  );
}

function RoleRow({ icon, role, access, color }) {
  const dotColor = { admin: 'bg-red-500', dispatcher: 'bg-blue-500', driver: 'bg-green-500', accountant: 'bg-purple-500', corporate: 'bg-indigo-500', individual: 'bg-amber-500' }[color] || 'bg-slate-400';
  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
      <div className="w-36 flex-shrink-0">
        <span className="text-sm font-semibold text-slate-800">{role}</span>
      </div>
      <div className="flex-1 flex flex-wrap gap-1.5">
        {access.map(a => (
          <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{a}</span>
        ))}
      </div>
    </div>
  );
}

function LevelCard({ level, title, subtitle, features, color }) {
  const palette = {
    slate:  { border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600', title: 'text-slate-800' },
    blue:   { border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-700',   title: 'text-blue-800' },
    indigo: { border: 'border-indigo-200',badge: 'bg-indigo-100 text-indigo-700',title: 'text-indigo-800'},
    purple: { border: 'border-purple-200',badge: 'bg-purple-100 text-purple-700',title: 'text-purple-800'},
  }[color] || { border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600', title: 'text-slate-800' };

  return (
    <div className={`bg-white rounded-2xl border-2 ${palette.border} p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${palette.badge}`}>L{level}</span>
        <div>
          <p className={`font-bold ${palette.title}`}>{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KpiCard({ icon, metric, value, desc, trend }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="font-semibold text-slate-700 text-sm mt-0.5">{metric}</p>
      <p className="text-xs text-slate-400 mt-1">{desc}</p>
    </div>
  );
}

export default function GuidePage({ embedded = false }) {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className={embedded ? 'bg-slate-50' : 'min-h-screen bg-slate-50'}>
      {/* Top nav — hidden when embedded in drawer */}
      {!embedded && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <img src="/logo.png" alt="Logix" className="w-8 h-8" />
              <span className="font-bold text-slate-800 text-sm">Logix</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <nav className="hidden sm:flex gap-1 overflow-x-auto flex-1">
              {NAV_SECTIONS.map(s => (
                <a key={s.id} href={`#${s.id}`}
                  onClick={() => setActiveSection(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeSection === s.id ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {s.label}
                </a>
              ))}
            </nav>
            <Link to="/login"
              className="ml-auto flex-shrink-0 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Вход →
            </Link>
          </div>
        </header>
      )}

      <main className={`${embedded ? 'px-6 py-8' : 'max-w-6xl mx-auto px-4 py-10'} space-y-16`}>

        {/* Hero — hidden when embedded */}
        {!embedded && (
        <div className="text-center py-10">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            Industry 4.0 · Ниво L3–L6
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 leading-tight">
            Logix<br />
            <span className="text-green-600">Платформа за управление</span><br />
            на отпадъци
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Дигитална система за оперативно управление на събирането и извозването на производствени и строителни отпадъци в Русенска и Североизточна България.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { icon: '🗺️', label: 'Оптимизация на маршрути', color: 'blue' },
              { icon: '📡', label: 'GPS мониторинг в реално време', color: 'green' },
              { icon: '📊', label: 'BI анализи и справки', color: 'purple' },
              { icon: '📱', label: 'Мобилно приложение за шофьори', color: 'amber' },
            ].map(({ icon, label, color }) => (
              <span key={label} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 text-sm px-4 py-2 rounded-xl shadow-sm">
                <span>{icon}</span>{label}
              </span>
            ))}
          </div>
        </div>
        )}

        {/* Overview */}
        <Section id="overview" title="Преглед на системата" subtitle="Три специализирани портала за всяка роля в организацията">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: <Map className="w-7 h-7 text-blue-600" />,
                bg: 'bg-blue-50 border-blue-200',
                title: 'Диспечерски портал',
                items: ['BI дашборд с графики', 'Управление на заявки', 'Live карта с GPS', 'Оптимизация маршрути', 'Управление на курсове'],
              },
              {
                icon: <Package className="w-7 h-7 text-green-600" />,
                bg: 'bg-green-50 border-green-200',
                title: 'Клиентски портал',
                items: ['Подаване на заявки', 'Избор на контейнер', 'Проследяване в реално', 'История и фактури', 'Сигнал "Пълен е"'],
              },
              {
                icon: <Truck className="w-7 h-7 text-amber-600" />,
                bg: 'bg-amber-50 border-amber-200',
                title: 'Шофьорско приложение',
                items: ['Дневен маршрут', 'Навигация', 'Потвърждение спирки', 'Отчет на проблеми', 'QR сканиране'],
              },
            ].map(({ icon, bg, title, items }) => (
              <Card key={title}>
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${bg}`}>{icon}</div>
                <h3 className="font-bold text-slate-800 mb-3">{title}</h3>
                <ul className="space-y-2">
                  {items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </Section>

        {/* Processes */}
        <Section id="processes" title="Работни процеси" subtitle="Два основни вида услуги с различни стъпки на обработка">
          <div className="space-y-6">
            {/* Container flow */}
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Контейнерна услуга</h3>
                  <p className="text-sm text-slate-500">Доставка → Пълнене от клиент → Вземане → Извозване</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <FlowStep icon="📝" label="Нова заявка" desc="PENDING_ADMIN" color="slate" />
                <FlowStep icon="✅" label="Потвърдена" desc="CONFIRMED" color="green" />
                <FlowStep icon="📅" label="Насрочена доставка" desc="DELIVERY_SCHEDULED" color="blue" />
                <FlowStep icon="📦" label="Контейнерът е доставен" desc="CONTAINER_DELIVERED" color="indigo" />
                <FlowStep icon="⏳" label="Чака пълнене" desc="AWAITING_FILL" color="amber" />
                <FlowStep icon="📅" label="Насрочено вземане" desc="PICKUP_SCHEDULED" color="blue" />
                <FlowStep icon="🚛" label="В транспорт" desc="IN_TRANSIT" color="amber" />
                <FlowStep icon="🏗️" label="На депо" desc="AT_DISPOSAL" color="purple" />
                <FlowStep icon="🔍" label="Проверка" desc="PENDING_VERIFICATION" color="slate" />
                <FlowStep icon="🎉" label="Завършена" desc="COMPLETED" color="green" arrow={false} />
              </div>
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="text-base flex-shrink-0">💡</span>
                  Клиентът натиска <strong>"Пълен е"</strong> в своя портал, когато контейнерът е готов за вземане. Системата автоматично преминава към <strong>PICKUP_SCHEDULED</strong> и насрочва курс.
                </p>
              </div>
            </Card>

            {/* Garbage truck flow */}
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Сметовозна услуга</h3>
                  <p className="text-sm text-slate-500">Директно товарене на място → Транспорт → Депо</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <FlowStep icon="📝" label="Нова заявка" desc="PENDING_ADMIN" color="slate" />
                <FlowStep icon="✅" label="Потвърдена" desc="CONFIRMED" color="green" />
                <FlowStep icon="📅" label="Насрочена" desc="SCHEDULED" color="blue" />
                <FlowStep icon="🚛" label="В транспорт" desc="IN_TRANSIT" color="amber" />
                <FlowStep icon="🏗️" label="На депо" desc="AT_DISPOSAL" color="purple" />
                <FlowStep icon="🔍" label="Проверка" desc="PENDING_VERIFICATION" color="slate" />
                <FlowStep icon="🎉" label="Завършена" desc="COMPLETED" color="green" arrow={false} />
              </div>
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm text-blue-700 flex items-start gap-2">
                  <span className="text-base flex-shrink-0">💡</span>
                  По-бърз цикъл — само едно посещение. Подходящо за текущи строителни обекти с непостоянни обеми отпадък.
                </p>
              </div>
            </Card>

            {/* Disposal sites */}
            <Card>
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="text-xl">🏗️</span>
                Депа за отпадъци в Русенска област
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'Депо Липник', zone: 'Русе', types: ['Смесени', 'Строителни', 'Инертни'] },
                  { name: 'Депо Бяла', zone: 'Бяла', types: ['Строителни', 'Индустриални'] },
                  { name: 'Депо Мартен', zone: 'Русе', types: ['Инертни', 'Строителни'] },
                  { name: 'Депо Две могили', zone: 'Две могили', types: ['Смесени', 'Инертни'] },
                  { name: 'Депо Иваново', zone: 'Иваново', types: ['Строителни'] },
                ].map(d => (
                  <div key={d.name} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <span className="text-xl flex-shrink-0">🏗️</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{d.name}</p>
                      <p className="text-xs text-slate-500 mb-1.5">Зона: {d.zone}</p>
                      <div className="flex flex-wrap gap-1">
                        {d.types.map(t => (
                          <span key={t} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        {/* Roles */}
        <Section id="roles" title="Роли и права за достъп" subtitle="Всяка роля вижда само информацията, от която се нуждае">
          <Card>
            <RoleRow color="admin" role="Администратор" access={['Пълен достъп', 'Потребители', 'Настройки', 'Финанси', 'Справки']} />
            <RoleRow color="dispatcher" role="Диспечер" access={['Заявки', 'Курсове', 'Карта', 'Оптимизация', 'Клиенти', 'Протоколи']} />
            <RoleRow color="driver" role="Шофьор" access={['Собствените курсове', 'Потвърждаване спирки', 'QR сканиране', 'Отчет проблеми']} />
            <RoleRow color="accountant" role="Счетоводител" access={['Фактури', 'Плащания', 'Финансови справки']} />
            <RoleRow color="corporate" role="Корпоративен клиент" access={['Заявки (собствени)', 'Договори', 'Фактури', 'Tracking']} />
            <RoleRow color="individual" role="Физическо лице" access={['Подаване на заявка', 'Статус', 'История', 'Плащане']} />
          </Card>
        </Section>

        {/* Industry 4.0 Levels */}
        <Section id="levels" title="Нива на дигитализация (Industry 4.0)" subtitle="Платформата покрива нива L3 до L6 от матрицата за управление на отпадъци">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LevelCard level={3} color="slate" title="Видимост" subtitle="Visibility — базово ниво"
              features={[
                'Дигитализация на всички заявки',
                'Статуси в реално време',
                'История на операциите',
                'Dashboard с KPI карти',
                'Управление на контейнери',
              ]} />
            <LevelCard level={4} color="blue" title="Прозрачност" subtitle="Transparency — оперативна ефективност"
              features={[
                'GPS мониторинг на камиони',
                'Route optimization (VRP)',
                'Клиентски нотификации',
                'QR сканиране на контейнери',
                'Отчети за проблеми',
              ]} />
            <LevelCard level={5} color="indigo" title="Предиктивност" subtitle="Predictive — data-driven решения"
              features={[
                'BI анализ с Recharts',
                'Trend анализ на заявките',
                'Натовареност по зони',
                'Сезонни модели',
                'KM спестени vs неоптимизирани',
              ]} />
            <LevelCard level={6} color="purple" title="Адаптивност" subtitle="Adaptability — автономни решения"
              features={[
                'Автоматично пренасрочване',
                'Динамична оптимизация',
                'Геофенсинг на депа',
                'Интеграция с IoT сензори',
                'Автогенерирани протоколи',
              ]} />
          </div>
        </Section>

        {/* KPIs */}
        <Section id="kpis" title="Ключови метрики (KPI)" subtitle="Измерими показатели за ефективност на операциите">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <KpiCard icon="🚛" metric="Изминати КМ/ден" value="284 км" desc="Средна стойност за 3 камиона" trend={-12} />
            <KpiCard icon="⛽" metric="Намаление горива" value="18%" desc="Спестено с оптимизация" trend={18} />
            <KpiCard icon="⏱️" metric="Avg цикъл контейнер" value="4.2 дни" desc="От заявка до завършване" trend={-8} />
            <KpiCard icon="✅" metric="Изпълнение" value="94.7%" desc="Спирки без проблем" trend={3} />
            <KpiCard icon="📦" metric="Контейнери активни" value="23" desc="Деплоирани при клиенти" />
            <KpiCard icon="🔄" metric="Ротация" value="8.1×" desc="Използвания/месец/контейнер" trend={5} />
            <KpiCard icon="⚠️" metric="Issues rate" value="5.3%" desc="Спирки с проблем" trend={-2} />
            <KpiCard icon="💰" metric="Приход/КМ" value="3.80 лв" desc="Средна ефективност" trend={11} />
          </div>

          <Card>
            <h3 className="font-bold text-slate-800 mb-4">Типове отпадъци</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: 'Строителни отпадъци', share: 38, color: 'bg-blue-500' },
                { type: 'Смесени строителни', share: 22, color: 'bg-indigo-500' },
                { type: 'Индустриални', share: 18, color: 'bg-purple-500' },
                { type: 'Инертни материали', share: 12, color: 'bg-amber-500' },
                { type: 'Домашен ремонт', share: 7, color: 'bg-green-500' },
                { type: 'Метални', share: 3, color: 'bg-slate-400' },
              ].map(({ type, share, color }) => (
                <div key={type} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 font-medium">{type}</span>
                      <span className="text-slate-500">{share}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full ${color}`} style={{ width: `${share}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* CTA — hidden when embedded */}
        {!embedded && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-10 text-center text-white">
            <h2 className="text-3xl font-black mb-3">Готови ли сте?</h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Влезте в платформата и изпробвайте трите портала — диспечерски дашборд, клиентски портал и шофьорско приложение.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/login"
                className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3.5 rounded-xl transition-colors">
                Вход в системата
              </Link>
              <Link to="/dev-login"
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-3.5 rounded-xl transition-colors border border-white/20">
                Бърз демо достъп →
              </Link>
            </div>
          </div>
        )}
      </main>

      {!embedded && (
        <footer className="border-t border-slate-200 mt-16 py-8 text-center text-slate-400 text-sm bg-white">
          <p>© 2025 Logix · Система за управление на отпадъци · Русе, България</p>
        </footer>
      )}
    </div>
  );
}
