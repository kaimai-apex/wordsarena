import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        coral: 'var(--coral)',
        teal: 'var(--teal)',
        mango: 'var(--mango)',
        papaya: 'var(--papaya)',
        lagoon: 'var(--lagoon)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        gem: 'var(--gem)',
        'gem-soft': 'var(--gem-soft)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      borderRadius: {
        bubble: '1.25rem',
        'bubble-lg': '1.75rem',
        'bubble-xl': '2.25rem',
      },
      boxShadow: {
        bubble: '0 8px 32px -8px rgba(255, 107, 107, 0.25), 0 4px 16px -4px rgba(78, 205, 196, 0.2)',
        tile: '0 4px 0 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
        'tile-hover': '0 6px 0 0 rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        wiggle: 'wiggle 0.5s ease-in-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
