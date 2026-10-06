import Reveal from './Reveal';

const industries = [
  {
    title: 'Сметоизвозване и рециклиране',
    text: 'Контейнери, графици, депа. Живото демо е действаща конфигурация.',
    live: true,
    icon: <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 4v8m4-8v8" />,
  },
  {
    title: 'Куриерски и последна миля',
    text: 'Десетки спирки, тесни прозорци. VRP подрежда деня.',
    icon: <path d="M20 7h-3V4H3v12h2a3 3 0 0 0 6 0h4a3 3 0 0 0 6 0h1v-6l-2-3zM7 18a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm10 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />,
  },
  {
    title: 'Дистрибуция и снабдяване',
    text: 'Редовни курсове до едни и същи обекти — храни, напитки, консумативи.',
    icon: <path d="M20 7l-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  },
  {
    title: 'Превоз на товари и палети',
    text: 'Заявка → курс → фактура, със статус на всеки етап.',
    icon: <path d="M5 8h14M5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 16h14M5 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm14 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 8v8m14-8v8" />,
  },
  {
    title: 'Полеви услуги и поддръжка',
    text: 'Екипи по адреси — монтаж, сервиз, инспекции, със статуси на живо.',
    icon: <path d="M14.7 6.3a4 4 0 0 0-5.3 5.3L4 17v3h3l5.4-5.4a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.1-2.1 2.7-2.5z" />,
  },
  {
    title: 'Строителна логистика',
    text: 'Машини, материали и извозване от обекти — без хартия.',
    icon: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M12 12h.01" />,
  },
];

export default function Industries() {
  return (
    <section id="industries" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal>
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-mint/80">За кого е</p>
          <h2 className="max-w-2xl font-display text-3xl font-medium leading-snug tracking-tight sm:text-4xl">
            Едно ядро. <em className="text-mint">Всеки бизнес на колела.</em>
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-haze">
            Logix е роден в един от най-тежките логистични браншове — сметоизвозването. Същото ядро —
            заявки, маршрути, флот, фактури — се конфигурира за всяка услуга с камиони, екипи и клиенти.
          </p>
        </Reveal>

        {/* bordered wall, no boxes */}
        <Reveal delay={0.1}>
          <div className="mt-14 grid overflow-hidden rounded-xl border border-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((ind) => (
              <div
                key={ind.title}
                className="group relative border-white/[0.08] p-7 transition-colors duration-300 hover:bg-white/[0.03] [&:not(:first-child)]:border-t sm:[&:nth-child(2n+1)]:border-r sm:[&:nth-child(2)]:border-t-0 lg:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(3n+1)]:border-r lg:[&:nth-child(3n+2)]:border-r lg:[&:nth-child(-n+3)]:border-t-0"
              >
                {ind.live && (
                  <span className="absolute right-5 top-5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-mint">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
                    </span>
                    Живо демо
                  </span>
                )}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-haze/70 transition-colors group-hover:text-mint">
                  {ind.icon}
                </svg>
                <h3 className="mt-5 font-medium text-paper">{ind.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-haze/80">{ind.text}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
