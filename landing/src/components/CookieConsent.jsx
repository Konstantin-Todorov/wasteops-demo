import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const KEY = 'logix_consent'; // 'all' | 'necessary'

function loadGTM() {
  const id = window.LOGIX_GTM_ID;
  if (!id || id.indexOf('GTM-') !== 0 || document.getElementById('gtm-script')) return;
  const s = document.createElement('script');
  s.id = 'gtm-script';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
  document.head.appendChild(s);
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
}

function grantAnalytics() {
  window.gtag?.('consent', 'update', {
    ad_storage: 'granted',
    analytics_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  });
  loadGTM();
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem(KEY);
    if (choice === 'all') grantAnalytics();
    else if (!choice) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  function decide(choice) {
    localStorage.setItem(KEY, choice);
    if (choice === 'all') grantAnalytics();
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 left-4 right-4 z-[60] max-w-sm rounded-2xl border border-white/10 bg-pine/95 p-5 shadow-2xl shadow-black/50 backdrop-blur sm:left-6 sm:right-auto"
          role="dialog"
          aria-label="Съгласие за бисквитки"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-mint/80">Бисквитки</p>
          <p className="mt-2 text-sm leading-relaxed text-haze">
            Използваме аналитични бисквитки, за да разберем как се ползва сайтът. Зареждат се само
            с ваше съгласие.{' '}
            <a href="/privacy.html" className="text-mint underline underline-offset-2 hover:text-brand">
              Политика за поверителност
            </a>
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => decide('all')}
              className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-mint"
            >
              Приемам
            </button>
            <button
              onClick={() => decide('necessary')}
              className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-haze transition-colors hover:bg-white/[0.05] hover:text-paper"
            >
              Само необходимите
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
