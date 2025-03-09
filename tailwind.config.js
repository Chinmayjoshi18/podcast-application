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
        'dm': ['var(--font-dm-sans)', 'sans-serif'],
      },
      colors: {
        primary: "#1d9bf0", // Twitter blue
        gray: {
          800: "#1f2937",
          900: "#111827",
        },
      },
    },
  },
  plugins: [],
};