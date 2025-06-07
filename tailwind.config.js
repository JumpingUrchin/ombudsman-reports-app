/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['var(--font-inter)', 'var(--font-noto-sans-tc)', 'system-ui', 'sans-serif'],
        'chinese': ['var(--font-noto-sans-tc)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}