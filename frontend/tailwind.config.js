/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs:    ['0.75rem',   { lineHeight: '1.125rem' }],
        sm:    ['0.8125rem', { lineHeight: '1.25rem' }],
        base:  ['0.875rem',  { lineHeight: '1.375rem' }],
        lg:    ['1rem',      { lineHeight: '1.5rem' }],
        xl:    ['1.125rem',  { lineHeight: '1.625rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.375rem',  { lineHeight: '1.875rem', letterSpacing: '-0.015em' }],
        '3xl': ['1.75rem',   { lineHeight: '2.125rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem',   { lineHeight: '2.5rem',   letterSpacing: '-0.025em' }],
      },
      colors: {
        // Всички цветове минават през CSS променливи, за да работи
        // светла и тъмна тема без дублиране на класове.
        canvas:  'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised:  'rgb(var(--c-raised) / <alpha-value>)',
        sunken:  'rgb(var(--c-sunken) / <alpha-value>)',
        line:    'rgb(var(--c-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--c-line-strong) / <alpha-value>)',
        ink:     'rgb(var(--c-ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--c-ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--c-ink-3) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)',
          soft:    'rgb(var(--c-brand-soft) / <alpha-value>)',
          strong:  'rgb(var(--c-brand-strong) / <alpha-value>)',
          ink:     'rgb(var(--c-brand-ink) / <alpha-value>)',
        },
        ok:    { DEFAULT: 'rgb(var(--c-ok) / <alpha-value>)',    soft: 'rgb(var(--c-ok-soft) / <alpha-value>)' },
        warn:  { DEFAULT: 'rgb(var(--c-warn) / <alpha-value>)',  soft: 'rgb(var(--c-warn-soft) / <alpha-value>)' },
        danger:{ DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)',soft: 'rgb(var(--c-danger-soft) / <alpha-value>)' },
        info:  { DEFAULT: 'rgb(var(--c-info) / <alpha-value>)',  soft: 'rgb(var(--c-info-soft) / <alpha-value>)' },
      },
      borderRadius: { xs: '3px', sm: '5px', DEFAULT: '7px', md: '9px', lg: '12px', xl: '16px', '2xl': '20px' },
      boxShadow: {
        xs:   'var(--e-xs)',
        sm:   'var(--e-sm)',
        DEFAULT: 'var(--e-md)',
        md:   'var(--e-md)',
        lg:   'var(--e-lg)',
        xl:   'var(--e-xl)',
        focus:'var(--e-focus)',
      },
      transitionTimingFunction: { swift: 'cubic-bezier(0.32, 0.72, 0, 1)' },
      keyframes: {
        'fade-in':  { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in-right': { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer:    { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'slide-up': 'slide-up .22s cubic-bezier(0.32,0.72,0,1)',
        'slide-in-right': 'slide-in-right .24s cubic-bezier(0.32,0.72,0,1)',
      },
    },
  },
  plugins: [],
};
