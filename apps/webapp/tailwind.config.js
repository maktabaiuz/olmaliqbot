/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Telegram & iOS Token Palette
        tg: {
          blue: '#2AABEE',
          darkBlue: '#0088CC',
          bgDark: '#0E141B',
          cardDark: '#16212F',
          surfaceDark: '#1C2733',
          textDark: '#E8EDF2',
          bgLight: '#EEF3F8',
          cardLight: '#FFFFFF',
          textLight: '#1C1C1E',
          textMuted: '#8A8A8E',
        },
        ios: {
          blue: '#007AFF',
          red: '#FF3B30',
          green: '#34C759',
          orange: '#FF9500',
          amber: '#FF9F0A',
          purple: '#AF52DE',
          teal: '#30B0C7',
          indigo: '#5856D6',
          pink: '#FF2D55',
          gray: '#8E8E93',
          separator: '#ECECF0',
          darkSeparator: '#2C2C2E',
        },
        gold: {
          start: '#E0A010',
          end: '#C8860A',
        },
        error: '#FF3B30',
        primary: '#007AFF',
        background: '#EEF3F8',
        surface: '#FFFFFF',
        outline: '#8A8A8E',
        'outline-variant': '#ECECF0',
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
        icon: '9px',
        pill: '9999px',
      },
      maxWidth: {
        'container-max': '680px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.04)',
        fab: '0 4px 14px rgba(42, 171, 238, 0.4)',
        gold: '0 4px 14px rgba(224, 160, 16, 0.4)',
      },
      fontFamily: {
        system: ["-apple-system", "'SF Pro Text'", "'SF Pro Display'", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
