/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,css}"
  ],
  theme: {
    extend: {
      colors: {
        chithVoid: '#0A0B0E',
        chithBone: '#FAF9F6',
        chithVolt: '#D4FF00',
        chithBruise: '#1C162E',
      },
      fontFamily: {
        brutal: ['Akzidenz-Grotesk', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Courier New', 'monospace'],
      }
    }
  },
  plugins: []
}
