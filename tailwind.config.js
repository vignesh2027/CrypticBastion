/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: '#030712',
          graphite: '#111827',
          panel: '#0d1117',
          border: '#1f2937',
          cyan: '#06b6d4',
          'cyan-dim': '#0891b2',
          blue: '#3b82f6',
          'blue-bright': '#60a5fa',
          red: '#ef4444',
          'red-bright': '#f87171',
          orange: '#f97316',
          green: '#22c55e',
          violet: '#8b5cf6',
          yellow: '#eab308',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        display: ['"Share Tech Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        scanline: 'scanline 8s linear infinite',
        'glow-cyan': 'glowCyan 2s ease-in-out infinite alternate',
        'glow-red': 'glowRed 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'flicker': 'flicker 3s infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glowCyan: {
          from: { boxShadow: '0 0 5px #06b6d4, 0 0 10px #06b6d4' },
          to: { boxShadow: '0 0 15px #06b6d4, 0 0 30px #06b6d4, 0 0 45px #06b6d480' },
        },
        glowRed: {
          from: { boxShadow: '0 0 5px #ef4444, 0 0 10px #ef4444' },
          to: { boxShadow: '0 0 15px #ef4444, 0 0 30px #ef4444, 0 0 45px #ef444480' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        flicker: {
          '0%, 95%, 100%': { opacity: '1' },
          '96%': { opacity: '0.8' },
          '97%': { opacity: '1' },
          '98%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

