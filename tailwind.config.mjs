/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {},
    colors: {
      "light-brown-bg": "#fffdfa",
      "dark-brown-bg": "#f4f0e7",
      "dark-brown-text": "#a69b85",
    },
  },
  plugins: [],
};
