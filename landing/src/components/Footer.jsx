export default function Footer() {
  return (
    <footer className="border-t border-white/[0.07] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 sm:flex-row lg:px-8">
        <div className="flex items-center gap-2.5">
          <img src="/logo-dark.png" alt="Logix" className="h-7 w-7" />
          <span className="font-semibold tracking-tight">
            Log<span className="text-brand">ix</span>
          </span>
        </div>
        <p className="font-mono text-xs text-haze/40">
          © {new Date().getFullYear()} Logix · логистика и полеви услуги · Русе, България
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="tel:+359894306704" className="flex items-center gap-2 text-sm text-haze/70 transition-colors hover:text-mint">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            0894 306 704
          </a>
          <a href="/privacy.html" className="text-sm text-haze/60 transition-colors hover:text-paper">
            Поверителност
          </a>
          <a href="#demo" className="text-sm font-medium text-mint transition-colors hover:text-brand">
            Запази демо →
          </a>
        </div>
      </div>
    </footer>
  );
}
