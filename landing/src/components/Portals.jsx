import Reveal from './Reveal';

const portals = [
  {
    role: 'Диспечер',
    tag: 'уеб',
    text: 'Табло с целия ден: заявки, курсове, флот и финанси — от едно място.',
    img: '/screens/dispatcher-orders.png',
    phone: false,
  },
  {
    role: 'Шофьор',
    tag: 'мобилно',
    text: 'Маршрутът за деня в телефона. QR сканиране и статуси с едно докосване.',
    img: '/screens/driver-home.png',
    phone: true,
  },
  {
    role: 'Клиент',
    tag: 'портал',
    text: 'Самообслужване: нова заявка за минути, история и фактури без обаждания.',
    img: '/screens/client-portal.png',
    phone: false,
  },
];

export default function Portals() {
  return (
    <section id="portals" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal>
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-mint/80">Три портала</p>
          <h2 className="max-w-2xl font-display text-3xl font-medium leading-snug tracking-tight sm:text-4xl">
            Всеки вижда своето. <em className="text-mint">Никой не звъни на никого.</em>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-3 lg:gap-8">
          {portals.map((p, i) => (
            <Reveal key={p.role} delay={i * 0.1}>
              <div className="row-line flex items-baseline justify-between pt-4">
                <h3 className="font-display text-xl font-medium">{p.role}</h3>
                <span className="font-mono text-[11px] uppercase tracking-wider text-haze/50">{p.tag}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-haze">{p.text}</p>
              <div className={`mt-7 ${p.phone ? 'flex justify-center px-8' : ''}`}>
                {p.phone ? (
                  <img src={p.img} alt={`Приложение за ${p.role.toLowerCase()}`} loading="lazy" className="phone max-h-[22rem] w-auto object-cover object-top" />
                ) : (
                  <div className="frame">
                    <img src={p.img} alt={`Портал за ${p.role.toLowerCase()}`} loading="lazy" className="block w-full" />
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
