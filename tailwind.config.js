/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: '#1a6b8a',
        sunset: '#e07b39',
        sand: '#f5e6c8',
      },
    },
  },
  plugins: [],
}
