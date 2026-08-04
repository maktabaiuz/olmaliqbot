/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        telegram: {
          blue: '#2AABEE',
          darkBlue: '#229ED9',
          bgDark: '#17212B',
          cardDark: '#1C2733',
          bgLight: '#FFFFFF',
          cardLight: '#F7F9FB',
        },
      },
      borderRadius: {
        'tg': '16px',
      },
    },
  },
  plugins: [],
};
