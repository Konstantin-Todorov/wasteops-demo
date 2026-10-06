/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#070b08',
        pine: '#0d130e',
        forest: '#0e4a25',
        brand: '#25c06a',
        mint: '#7df0a8',
        haze: '#9fb3a6',
        paper: '#e9f0ea',
      },
      fontFamily: {
        display: ['Literata', 'Georgia', 'serif'],
        body: ['"Golos Text"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
