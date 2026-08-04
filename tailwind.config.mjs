/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "light-brown-bg": "#ffffff",
        "dark-brown-bg": "#73b6eb",
        "dark-brown-text": "#195695",
      },
    },
  },
  plugins: [],
};
