/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tg: '#2AABEE',
        'tg-dark': '#0088CC',
        'ios-blue': '#007AFF',
        'ios-red': '#FF3B30',
        'ios-green': '#34C759',
        'ios-orange': '#FF9500',
        'ios-amber': '#FF9F0A',
        'ios-purple': '#AF52DE',
        'ios-teal': '#30B0C7',
        'ios-indigo': '#5856D6',
        'ios-gray': '#8E8E93',
        'ios-bg': '#EEF3F8',
        'ios-sep': '#ECECF0',
        gold: '#C8860A',
        // Existing fallback aliases for safety
        primary: '#2AABEE',
        'primary-container': '#2AABEE',
        error: '#FF3B30',
        background: '#EEF3F8',
        surface: '#FFFFFF',
      },
      backgroundImage: {
        'tg-grad': 'linear-gradient(135deg, #2AABEE 0%, #0088CC 100%)',
        'gold-grad': 'linear-gradient(135deg, #E0A010 0%, #C8860A 100%)',
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
        fab: '0 4px 14px rgba(42, 171, 238, 0.4)',
        card: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
