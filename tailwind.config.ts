import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        jarvis: { cyan: '#00e5ff', blue: '#0083ff', deep: '#02060f', ice: '#8be9ff' },
      },
      fontFamily: { mono: ['ui-monospace', 'SFMono-Regular', 'monospace'] },
      boxShadow: { glow: '0 0 24px rgba(0,229,255,0.35)' },
    },
  },
  plugins: [],
} satisfies Config;
