/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 吉他主题色（可按需扩展）
        'guitar-dark': '#1a1a2e',
        'guitar-accent': '#e94560',
      },
    },
  },
  plugins: [],
};
