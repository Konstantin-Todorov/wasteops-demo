import Reveal from './Reveal';

const steps = [
  ['Клиентът подава заявка', 'През портала, за две минути — доставка, извозване или услуга на място.'],
  ['Системата подрежда маршрута', 'Диспечерът одобрява, алгоритъмът оптимизира реда по реални пътища.'],
  ['Шофьорът изпълнява', 'Маршрутът е в телефона му. GPS позицията се вижда на живо.'],
  ['Фактурата излиза сама', 'Завършеният курс става фактура. Клиентът я вижда в портала си.'],
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal>
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-mint/80">Как работи</p>
          <h2 className="max-w-2xl font-display text-3xl font-medium leading-snug tracking-tight sm:text-4xl">
            От заявка до платена фактура — <em className="text-mint">по права линия.</em>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-x-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.08}>
              <div className="row-line py-6">
                <p className="font-mono text-sm text-brand">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-3 font-medium text-paper">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-haze/80">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
