import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      screens: {
        'xs': '375px',   // small phones
        'sm': '640px',   // large phones / small tablets
        'md': '768px',   // tablets
        'lg': '1024px',  // laptops / POS tablets
        'xl': '1280px',  // desktop monitors
        '2xl': '1536px', // large POS monitors / 27"+ screens
        '3xl': '1920px', // full HD POS display
      },
      colors: {
        amber: { 400: '#fbbf24', 500: '#f59e0b' },
      },
    },
  },
  plugins: [],
};

export default config;
