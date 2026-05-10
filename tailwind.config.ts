import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        peregrine: {
          dark: '#0F172A',
          orange: '#FF4D2E',
          gray: { 900: '#111827', 800: '#1F2937', 700: '#374151' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
