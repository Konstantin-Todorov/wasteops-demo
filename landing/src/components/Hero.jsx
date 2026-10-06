import { motion } from 'framer-motion';
import EmailForm from './EmailForm';
import { ContainerScroll } from './ui/container-scroll-animation';

const ease = [0.22, 1, 0.36, 1];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-24 md:pt-16">
      {/* single static glow — clean, no patterns, no flicker */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(58% 44% at 50% -8%, rgba(37,192,106,0.16), transparent 70%), radial-gradient(40% 30% at 82% 4%, rgba(14,74,37,0.35), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 lg:px-8">
        <ContainerScroll
          titleComponent={
            <>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease }}
                className="mb-7 font-mono text-xs uppercase tracking-[0.3em] text-mint/80"
              >
                Платформа за логистика и полеви услуги
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.08, ease }}
                className="font-display text-[2.6rem] font-medium leading-[1.15] tracking-tight sm:text-6xl"
              >
                Всеки курс. Всяка спирка.
                <br />
                <em className="text-mint">В реално време.</em>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.18, ease }}
                className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-haze"
              >
                Logix обединява заявки, маршрути, шофьори и фактури в една система — за доставки,
                извозвания и курсове по график. По-малко километри. Повече свършена работа.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.28, ease }}
                className="mt-9 flex justify-center"
              >
                <EmailForm id="hero" />
              </motion.div>
            </>
          }
        >
          <div className="frame-bar shrink-0">
            <span className="frame-dot" />
            <span className="frame-dot" />
            <span className="frame-dot" />
            <span className="ml-3 font-mono text-xs text-haze/60">logix / диспечер / табло</span>
          </div>
          <img
            src="/screens/dispatcher-dashboard.png"
            alt="Диспечерско табло на Logix — заявки, курсове, флот и финанси в реално време"
            draggable={false}
            fetchpriority="high"
            className="h-full w-full object-cover object-top"
          />
        </ContainerScroll>
      </div>
    </section>
  );
}
