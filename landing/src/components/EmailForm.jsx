import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmailForm({ id }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Нещо се обърка. Опитайте отново.');
      setState('done');
      setMessage(data.message || 'Готово! Проверете пощата си — демо линкът пътува към вас.');
    } catch (err) {
      setState('error');
      setMessage(err.message);
    }
  }

  if (state === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/10 px-5 py-4 text-left text-mint"
      >
        <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" />
          <path d="m9 11 3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <p className="font-medium">{message}</p>
          <p className="text-sm text-haze/70">Ако не го виждате до 2 минути, погледнете в папка „Спам“.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-lg">
      <div className="flex flex-col gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] p-1.5 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="вашият@имейл.bg"
          className="min-w-0 flex-1 rounded-lg bg-transparent px-4 py-3 text-base text-paper outline-none placeholder:text-haze/40"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="shrink-0 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-mint disabled:opacity-60"
        >
          {state === 'sending' ? 'Изпращане…' : 'Изпрати ми демото →'}
        </button>
      </div>
      <AnimatePresence>
        {state === 'error' && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 px-2 text-sm text-red-400"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
      <p className="mt-3 px-2 text-sm text-haze/55">
        Получавате линк с пълен достъп до живото демо — без карта, без инсталация.
      </p>
      <p className="mt-1.5 px-2 text-xs text-haze/40">
        С изпращането се съгласявате с{' '}
        <a href="/privacy.html" className="underline underline-offset-2 hover:text-mint">
          Политиката за поверителност
        </a>
        .
      </p>
    </form>
  );
}
