const items = [
  'VRP оптимизация на маршрути',
  'GPS проследяване на живо',
  'Реални пътни разстояния',
  'Автоматично фактуриране',
  'Мобилно приложение за шофьори',
  'Клиентски портал за заявки',
  'QR сканиране на пратки и обекти',
  'Известия в реално време',
];

export default function StatStrip() {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.07] py-3.5">
      <div className="marquee-track flex w-max items-center gap-12 whitespace-nowrap">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-12 font-mono text-[11px] uppercase tracking-[0.22em] text-haze/45">
            {t}
            <span className="text-brand/60">→</span>
          </span>
        ))}
      </div>
    </div>
  );
}
