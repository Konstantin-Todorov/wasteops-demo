import { useEffect, useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import Reveal from './Reveal';

const stations = [
  {
    chip: 'Жива карта',
    title: 'Флотът ви. На живо.',
    text: 'Камиони, спирки и бази върху реална карта. Позициите се обновяват в реално време — диспечерът вижда всичко, без да вдига телефона.',
    rows: [
      ['GPS в реално време', 'Всяко превозно средство, обновявано на живо.'],
      ['Статус на всяка спирка', 'Завършена, предстояща, проблемна — с един поглед.'],
      ['Бази и зони на покритие', 'Депа, обекти и маршрути върху една карта.'],
    ],
    media: { type: 'video', src: '/screens/map-live.mp4', poster: '/screens/dispatcher-map.png', crumb: 'диспечер / карта' },
  },
  {
    chip: 'Оптимизация',
    title: 'Маршрутът се подрежда сам.',
    text: 'Алгоритъмът пресмята най-краткия ред на спирките по реални пътни разстояния — и показва точно колко километра, литри и евро спестявате, преди камионът да потегли.',
    rows: [
      ['Реални пътища, не въздушни линии', 'Разстоянията идват от реалната пътна мрежа.'],
      ['Спестявания в км, литри и €', 'Видими за всеки курс, преди тръгване.'],
      ['Ръчно пренареждане', 'Когато диспечерът знае по-добре — с влачене.'],
    ],
    media: { type: 'video', src: '/screens/trips-optimize.mp4', poster: '/screens/dispatcher-trips.png', crumb: 'диспечер / курсове' },
  },
  {
    chip: 'Заявки',
    title: 'Заявките идват сами.',
    text: 'Клиентите подават заявки през собствен портал. Диспечерът одобрява с един клик — без телефонни тефтери, без загубени поръчки.',
    rows: [
      ['Клиентски портал', 'Нова заявка за две минути, от всяко устройство.'],
      ['Одобрение с един клик', 'Чакащите заявки светят, докато не са обработени.'],
      ['Известия в реално време', 'Ново, проблемно, просрочено — на едно място.'],
    ],
    media: { type: 'video', src: '/screens/orders-flow.mp4', poster: '/screens/dispatcher-orders.png', crumb: 'диспечер / заявки' },
  },
  {
    chip: 'Фактуриране',
    title: 'Курсът свърши. Фактурата е готова.',
    text: 'Всеки завършен курс автоматично става фактура. Платени, неплатени и просрочени — разделени ясно, с известия преди да стане късно.',
    rows: [
      ['Фактура от един клик', 'Директно от завършения курс.'],
      ['Просрочията светват сами', 'Преди да станат загуба.'],
      ['Финансов изглед по клиент', 'Кой дължи, кой плаща навреме.'],
    ],
    media: { type: 'video', src: '/screens/invoices-detail.mp4', poster: '/screens/dispatcher-invoices.png', crumb: 'диспечер / фактури' },
  },
];

function Truck() {
  return (
    <svg width="26" height="52" viewBox="0 0 26 52" fill="none" style={{ filter: 'drop-shadow(0 0 10px rgba(37,192,106,.7))' }}>
      {/* trailer */}
      <rect x="4.5" y="3" width="17" height="30" rx="3.5" fill="#0d130e" stroke="#25c06a" strokeWidth="1.5" />
      <line x1="8" y1="9" x2="18" y2="9" stroke="rgba(125,240,168,.35)" strokeWidth="1" />
      <line x1="8" y1="15" x2="18" y2="15" stroke="rgba(125,240,168,.35)" strokeWidth="1" />
      <line x1="8" y1="21" x2="18" y2="21" stroke="rgba(125,240,168,.35)" strokeWidth="1" />
      {/* cab, facing down (direction of travel) */}
      <rect x="5.5" y="36" width="15" height="11" rx="3" fill="#25c06a" />
      <rect x="7.5" y="38" width="11" height="4" rx="1.5" fill="#0d130e" opacity=".55" />
      {/* headlights */}
      <rect x="7" y="47.5" width="3.5" height="2.5" rx="1" fill="#7df0a8" />
      <rect x="15.5" y="47.5" width="3.5" height="2.5" rx="1" fill="#7df0a8" />
    </svg>
  );
}

function Media({ media }) {
  const videoRef = useRef(null);

  // play only while visible — keeps every video running when scrolled to
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="frame">
      <div className="frame-bar">
        <span className="frame-dot" />
        <span className="frame-dot" />
        <span className="frame-dot" />
        <span className="ml-3 font-mono text-xs text-haze/60">logix / {media.crumb}</span>
      </div>
      {media.type === 'video' ? (
        <video
          ref={videoRef}
          src={media.src}
          poster={media.poster}
          loop
          muted
          playsInline
          preload="metadata"
          className="block w-full"
        />
      ) : (
        <img src={media.src} alt="" loading="lazy" className="block w-full" />
      )}
    </div>
  );
}

export default function Stations() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.55', 'end 0.8'] });
  const progress = useSpring(scrollYProgress, { stiffness: 50, damping: 18 });
  const top = useTransform(progress, (v) => `${v * 100}%`);
  const lineH = useTransform(progress, (v) => `${v * 100}%`);

  return (
    <section id="features" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <div ref={ref} className="relative">
          {/* the track */}
          <div className="absolute bottom-0 left-[7px] top-2 hidden w-px bg-white/10 lg:block" />
          <motion.div
            style={{ height: lineH }}
            className="absolute left-[7px] top-2 hidden w-px bg-gradient-to-b from-brand/0 via-brand/80 to-mint lg:block"
          />
          {/* the truck riding the track */}
          <motion.div
            style={{ top }}
            className="absolute left-[7.5px] z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
            aria-hidden
          >
            <Truck />
          </motion.div>

          <div className="space-y-28 lg:space-y-40">
            {stations.map((s, i) => (
              <div key={s.chip} className="relative lg:pl-20">
                {/* station node */}
                <span className="absolute left-0 top-2 hidden h-[15px] w-[15px] rounded-full border-2 border-haze/40 bg-ink lg:block" />

                <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
                  <Reveal>
                    <p className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-xs text-mint">
                      <span className="text-haze/50">{String(i + 1).padStart(2, '0')}</span> {s.chip}
                    </p>
                    <h2 className="font-display text-3xl font-medium leading-snug tracking-tight sm:text-4xl">
                      {s.title}
                    </h2>
                    <p className="mt-4 leading-relaxed text-haze">{s.text}</p>
                    <div className="mt-8">
                      {s.rows.map(([t, d]) => (
                        <div key={t} className="row-line flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-baseline sm:gap-4">
                          <p className="shrink-0 font-medium text-paper sm:w-56">{t}</p>
                          <p className="text-sm text-haze/80">{d}</p>
                        </div>
                      ))}
                    </div>
                  </Reveal>
                  <Reveal delay={0.12} y={28}>
                    <Media media={s.media} />
                  </Reveal>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
