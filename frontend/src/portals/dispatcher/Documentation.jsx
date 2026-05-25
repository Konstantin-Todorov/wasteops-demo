import React, { useState } from 'react';
import {
  LayoutDashboard, ClipboardList, Map, Truck, Factory, UserCheck,
  Users, FileText, Wrench, Settings, Smartphone, UserCircle,
  ChevronDown, ChevronRight, BookOpen, CheckCircle2, Info, Zap,
} from 'lucide-react';

const SECTIONS = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    color: 'text-indigo-400',
    bg: 'bg-indigo-900/20',
    title: 'Табло (BI Dashboard)',
    role: 'ADMIN · DISPATCHER · ACCOUNTANT',
    desc: 'Централна аналитична страница с обобщени показатели за работата на компанията.',
    features: [
      'KPI карти — общи заявки, активни курсове, изминати км, приход',
      'Графика на заявките по статус (Recharts bar chart)',
      'Заявки по тип контейнер (pie chart)',
      'Топ клиенти по брой поръчки',
      'Последни 10 събитий в системата (order events)',
      'Статус на камионите в реално време',
    ],
    tips: ['Данните се опресняват при зареждане на страницата.', 'Счетоводителят вижда само финансови KPI.'],
  },
  {
    id: 'orders',
    icon: ClipboardList,
    color: 'text-blue-400',
    bg: 'bg-blue-900/20',
    title: 'Заявки',
    role: 'ADMIN · DISPATCHER',
    desc: 'Управление на всички заявки от клиенти — преглед, потвърждение, планиране.',
    features: [
      'Списък с всички заявки + филтри (статус, клиент, тип)',
      'Детайлен изглед — адрес, тип контейнер, дата, бележки',
      'Смяна на статус: pending → confirmed → scheduled → completed',
      'Drag-and-drop планиране към курс',
      'Хронология на събитията за всяка заявка',
      'Търсене по адрес или клиент',
    ],
    statuses: [
      { s: 'pending', label: 'Изчаква', color: 'bg-yellow-500' },
      { s: 'confirmed', label: 'Потвърдена', color: 'bg-blue-500' },
      { s: 'scheduled', label: 'Планирана', color: 'bg-indigo-500' },
      { s: 'in_progress', label: 'В изпълнение', color: 'bg-orange-500' },
      { s: 'completed', label: 'Завършена', color: 'bg-green-500' },
      { s: 'cancelled', label: 'Отказана', color: 'bg-red-500' },
    ],
    tips: ['Нова заявка може да бъде подадена от клиентския портал или ръчно от диспечера.'],
  },
  {
    id: 'map',
    icon: Map,
    color: 'text-emerald-400',
    bg: 'bg-emerald-900/20',
    title: 'Карта (LiveMap)',
    role: 'ADMIN · DISPATCHER',
    desc: 'Интерактивна карта с реално GPS местоположение на камионите и всички маршрути.',
    features: [
      'Leaflet.js + OpenStreetMap — без такси за API',
      'Цветни маршрути за всеки камион (различен цвят)',
      'VRP оптимален маршрут — зелена пунктирана линия с ореол',
      'Ръчен маршрут — оранжева линия с предупреждение',
      'Симулирано GPS движение на камионите (Socket.io)',
      'Маркери за депа с тип отпадъци и радиус на приемане',
      'Редактиране на депа директно от картата (панел вдясно)',
      'Сравнение ръчен vs VRP маршрут в км / лева / литри гориво',
      'Панел с текущи спирки за избран камион',
    ],
    tips: [
      'Кликни върху маркер на депо → "Редактирай" за промяна на данните.',
      'Оранжев маршрут = ръчно наредени спирки, по-лош от VRP.',
      'Зелен пунктиран = VRP оптимален ред.',
    ],
  },
  {
    id: 'trips',
    icon: Truck,
    color: 'text-orange-400',
    bg: 'bg-orange-900/20',
    title: 'Курсове',
    role: 'ADMIN · DISPATCHER',
    desc: 'Управление на дневните курсове — планиране, VRP оптимизация, проследяване на спирки.',
    features: [
      'Списък на курсовете по дата с филтри',
      'Детайлен изглед — камион, шофьор, всички спирки',
      'Drag-and-drop пренареждане на спирките',
      'VRP сравнение: текущ vs оптимален vs произволен ред',
      'Бутон "Приложи VRP ред" — автоматично оптимизира наредбата',
      'Статус на всяка спирка: изчаква / пристигнал / завършена / проблем',
      'Бележки за проблеми от шофьора (issueNote)',
      'Изминати км и прогнозен приход след завършване',
    ],
    tips: [
      'Кехлибарен банер = ръчният ред е по-дълъг от VRP — кликни "Приложи VRP".',
      'Зелен банер = ръчният ред е ≤ VRP — добре наредено.',
    ],
  },
  {
    id: 'disposal-sites',
    icon: Factory,
    color: 'text-amber-400',
    bg: 'bg-amber-900/20',
    title: 'Депа',
    role: 'ADMIN · DISPATCHER',
    desc: 'Управление на депата и площадките за третиране на отпадъци.',
    features: [
      'Карточен изглед на всички депа с адрес и координати',
      'Типове отпадъци: строителни, метали, смесени, опасни, зелени, хартия',
      'Радиус на приемане (метри) — показва се на картата',
      'Активни / неактивни депа (soft delete ако има курсове)',
      'CRUD: създаване, редактиране, деактивиране',
      'Интеграция с картата — маркери и редактиране от картата',
    ],
    tips: ['Депо с курсове не може да се изтрие — автоматично се деактивира (soft delete).'],
  },
  {
    id: 'drivers',
    icon: UserCheck,
    color: 'text-cyan-400',
    bg: 'bg-cyan-900/20',
    title: 'Шофьори',
    role: 'ADMIN · DISPATCHER',
    desc: 'Управление на шофьорите — профили, ставки, активни курсове.',
    features: [
      'Карточен изглед с профил на всеки шофьор',
      'Редактиране: имe, телефон, часова ставка (€/ч)',
      'Добавяне на нов шофьор с имейл и парола',
      'Статистика: изминати км, завършени курсове',
      'Текущ статус (наличен / в курс)',
    ],
    tips: ['Имейлът не може да се сменя след регистрация — само от администратор в базата.'],
  },
  {
    id: 'clients',
    icon: Users,
    color: 'text-violet-400',
    bg: 'bg-violet-900/20',
    title: 'Клиенти',
    role: 'ADMIN · DISPATCHER',
    desc: 'Регистрирани клиенти — корпоративни и физически лица.',
    features: [
      'Два типа клиенти: корпоративен (фирма) и физическо лице',
      'Профил: адрес, координати, контакт лице, ЕИК/ЕГН',
      'История на заявките и фактурите',
      'Карта на клиентите',
      'Добавяне и редактиране на клиенти',
    ],
    tips: ['Корпоративните клиенти имат достъп до клиентски портал с фирмени договори.'],
  },
  {
    id: 'invoices',
    icon: FileText,
    color: 'text-green-400',
    bg: 'bg-green-900/20',
    title: 'Фактури',
    role: 'ADMIN · ACCOUNTANT',
    desc: 'Издаване и проследяване на фактури — статуси, плащания.',
    features: [
      'Списък на всички фактури с филтри по статус и клиент',
      'Статуси: чернова → изпратена → платена / просрочена',
      'Генериране на фактура от завършен курс',
      'Изтегляне на PDF (mock)',
      'Маркиране като платена',
      'Просрочените фактури се появяват в нотификациите',
    ],
    statuses: [
      { s: 'draft', label: 'Чернова', color: 'bg-slate-500' },
      { s: 'sent', label: 'Изпратена', color: 'bg-blue-500' },
      { s: 'paid', label: 'Платена', color: 'bg-green-500' },
      { s: 'overdue', label: 'Просрочена', color: 'bg-red-500' },
    ],
    tips: ['Просрочена фактура автоматично генерира нотификация с висок приоритет.'],
  },
  {
    id: 'trucks',
    icon: Wrench,
    color: 'text-slate-400',
    bg: 'bg-slate-700/20',
    title: 'Автомобили',
    role: 'ADMIN',
    desc: 'Управление на автопарка — регистрационни номера, капацитет, статус.',
    features: [
      '3 камиона: Mercedes Actros (10 м³), MAN TGS (7 м³), Volvo FE (4 м³)',
      'Редактиране: рег. номер, капацитет (м³ и кг), статус',
      'Присвояване на шофьор',
      'Статус: наличен / в курс / в ремонт',
    ],
    tips: ['Само ADMIN вижда страницата Автомобили.'],
  },
  {
    id: 'settings',
    icon: Settings,
    color: 'text-slate-300',
    bg: 'bg-slate-700/30',
    title: 'Настройки',
    role: 'ADMIN',
    desc: 'Системни настройки на платформата.',
    features: [
      'Фирмени данни: наименование, ЕИК, адрес, лого',
      'Цени по тип контейнер и тип отпадък',
      'Часова ставка по подразбиране за шофьори',
      'Цена на гориво (лв/л) — използва се в изчисленията за спестявания',
      'Параметри на VRP алгоритъма',
    ],
    tips: ['Промените в цените на горивото влияят на изчисленията в Курсове и Карта.'],
  },
  {
    id: 'client-portal',
    icon: UserCircle,
    color: 'text-teal-400',
    bg: 'bg-teal-900/20',
    title: 'Клиентски портал',
    role: 'CORPORATE_CLIENT · INDIVIDUAL_CLIENT',
    desc: 'Портал за клиентите — подаване на заявки, проследяване, фактури.',
    features: [
      'Табло: активни заявки, история, баланс',
      'Нова заявка: тип контейнер, адрес (map picker), дата, бележки',
      'Проследяване: статус на заявката, ETA на камиона',
      'История: всички минали услуги с детайли',
      'Фактури: изтегляне и преглед',
      'Профил: контактни данни',
    ],
    tips: ['Клиентът вижда само своите заявки и фактури, не чуждите.'],
  },
  {
    id: 'driver-app',
    icon: Smartphone,
    color: 'text-pink-400',
    bg: 'bg-pink-900/20',
    title: 'Шофьорско приложение',
    role: 'DRIVER',
    desc: 'PWA за мобилни устройства — маршрути, навигация, потвърждаване на спирки.',
    features: [
      'Дневен маршрут: всички спирки с адрес и тип контейнер',
      'Навигация: линк към Google Maps/Waze с координатите',
      'Потвърди пристигане и завършване на спирка',
      'Отчети проблем: dropdown + снимка',
      'QR сканиране на контейнери (camera API)',
      'Работи офлайн (PWA с Service Worker)',
    ],
    tips: [
      'Приложението е оптимизирано за мобилен екран.',
      'Офлайн режим — маршрутът се кешира при зареждане.',
    ],
  },
];

function SectionCard({ section, isOpen, onToggle }) {
  const Icon = section.icon;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-750 transition-colors text-left"
      >
        <div className={`w-9 h-9 rounded-lg ${section.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${section.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">{section.title}</span>
            <span className="text-xs text-slate-500 font-mono">{section.role}</span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5 truncate">{section.desc}</p>
        </div>
        {isOpen
          ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        }
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-700/60">
          <div className="pt-4 grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Функционалност</p>
              <ul className="space-y-1.5">
                {section.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              {section.statuses && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Статуси</p>
                  <div className="flex flex-wrap gap-1.5">
                    {section.statuses.map(s => (
                      <span key={s.s} className={`inline-flex items-center gap-1.5 text-xs text-white px-2.5 py-1 rounded-full ${s.color}`}>
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {section.tips && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Бележки</p>
                  <div className="space-y-1.5">
                    {section.tips.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-400 bg-slate-700/40 rounded-lg px-3 py-2">
                        <Info className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Documentation() {
  const [openSections, setOpenSections] = useState(new Set(['dashboard']));

  function toggle(id) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() { setOpenSections(new Set(SECTIONS.map(s => s.id))); }
  function collapseAll() { setOpenSections(new Set()); }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Документация</h1>
            <p className="text-slate-400 text-sm">Logix v2.37 — всички модули и функции</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors">
            Разгъни всички
          </button>
          <button onClick={collapseAll} className="text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors">
            Свий всички
          </button>
        </div>
      </div>

      {/* Overview banner */}
      <div className="bg-gradient-to-r from-green-900/40 to-slate-800 border border-green-800/40 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Zap className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white mb-1">Три портала, един продукт</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Платформата Logix включва <strong className="text-slate-200">Диспечерски портал</strong> (управление на операциите),&nbsp;
            <strong className="text-slate-200">Клиентски портал</strong> (самообслужване на клиентите) и&nbsp;
            <strong className="text-slate-200">Шофьорско приложение</strong> (PWA за мобилни устройства).
            Всяка роля вижда само своите функции.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {SECTIONS.map(section => (
          <SectionCard
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>

      <p className="text-center text-xs text-slate-600 mt-8">
        Logix v2.37 · Демо платформа · Русенска и Североизточна България
      </p>
    </div>
  );
}
