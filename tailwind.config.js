/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'spotify-green':      '#1DB954',
        'spotify-green-dark': '#158a3e',
        'spotify-black':      '#191414',
        'spotify-dark':       '#121212',
        'spotify-gray':       '#282828',
        'spotify-light-gray': '#B3B3B3',
      },
      boxShadow: {
        'green-glow': '0 0 30px rgba(29, 185, 84, 0.35)',
        'card':       '0 25px 60px rgba(0,0,0,0.7)',
      },
      keyframes: {
        audioBar: {
          '0%':   { height: '4px' },
          '100%': { height: '18px' },
        },
      },
      animation: {
        'bar-1': 'audioBar 0.9s ease-in-out infinite alternate',
        'bar-2': 'audioBar 0.7s ease-in-out infinite alternate 0.2s',
        'bar-3': 'audioBar 1.1s ease-in-out infinite alternate 0.1s',
        'bar-4': 'audioBar 0.8s ease-in-out infinite alternate 0.3s',
      },
    },
  },
  plugins: [],
};