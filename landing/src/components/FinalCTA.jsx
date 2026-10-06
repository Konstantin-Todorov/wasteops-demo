import Reveal from './Reveal';
import EmailForm from './EmailForm';

export default function FinalCTA() {
  return (
    <section id="demo" className="relative overflow-hidden py-28 lg:py-36">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 60% at 50% 110%, rgba(37,192,106,0.16), transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-2xl px-5 text-center lg:px-8">
        <Reveal>
          <h2 className="font-display text-3xl font-medium leading-snug tracking-tight sm:text-5xl">
            Вижте го с очите си.
            <br />
            <em className="text-mint">За две минути.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-xl leading-relaxed text-haze">
            Оставете имейл и получавате незабавен достъп до живото демо — действаща конфигурация с
            реални маршрути, камиони и клиенти.
          </p>
        </Reveal>
        <Reveal delay={0.12} className="mt-10 flex justify-center">
          <EmailForm id="footer" />
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-haze/50">
            <span>Без кредитна карта</span>
            <span className="text-brand/60">·</span>
            <span>Без инсталация</span>
            <span className="text-brand/60">·</span>
            <span>Достъп до трите портала</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
