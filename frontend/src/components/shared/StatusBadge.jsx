const STATUS_CONFIG = {
  // Order statuses
  PENDING_ADMIN:         { label: 'Чака одобрение', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  CONFIRMED:             { label: 'Потвърдена',      cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  DELIVERY_SCHEDULED:    { label: 'Насрочена доставка', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  CONTAINER_DELIVERED:   { label: 'Контейнер доставен', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  AWAITING_FILL:         { label: 'Чака пълнене',    cls: 'bg-purple-100 text-purple-800 border-purple-200' },
  PICKUP_SCHEDULED:      { label: 'Насрочено вземане', cls: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  SCHEDULED:             { label: 'Насрочена',       cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  IN_TRANSIT:            { label: 'В движение',      cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  AT_DISPOSAL:           { label: 'В депо',           cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  PENDING_VERIFICATION:  { label: 'Чака верификация', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  COMPLETED:             { label: 'Завършена',        cls: 'bg-green-100 text-green-800 border-green-200' },
  CANCELLED:             { label: 'Отменена',         cls: 'bg-red-100 text-red-800 border-red-200' },
  // Trip statuses
  PLANNED:               { label: 'Планиран',         cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  IN_PROGRESS:           { label: 'В изпълнение',     cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  AT_DISPOSAL_TRIP:      { label: 'В депо',            cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  PENDING_VERIFICATION_TRIP: { label: 'Чака верификация', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  // Container statuses
  AVAILABLE:             { label: 'Наличен',          cls: 'bg-green-100 text-green-800 border-green-200' },
  DEPLOYED:              { label: 'При клиент',       cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  MAINTENANCE:           { label: 'Сервиз',           cls: 'bg-red-100 text-red-800 border-red-200' },
  // Stop statuses
  PENDING:               { label: 'Предстои',         cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  ARRIVED:               { label: 'Пристигнал',       cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  ISSUE_REPORTED:        { label: 'Проблем',          cls: 'bg-red-100 text-red-800 border-red-200' },
};

const TYPE_CONFIG = {
  CONTAINER:      { label: '📦 Контейнер',      cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  GARBAGE_TRUCK:  { label: '🚛 Сметосъбирач',  cls: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export default function StatusBadge({ status, type, size = 'sm' }) {
  const cfg = type ? TYPE_CONFIG[type] : STATUS_CONFIG[status];
  if (!cfg) return <span className="text-slate-400 text-xs">{status || type}</span>;
  const sz = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sz} ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
