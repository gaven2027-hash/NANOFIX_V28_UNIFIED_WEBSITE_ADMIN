const config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./lib/legacy/**/*.{html,json,css}",
    "./lib/nanofix/**/*.{ts,tsx}",
    "./tools/**/*.{mjs,js}"
  ],
  safelist: [
    "opacity-75",
    "cursor-not-allowed",
    "hidden",
    "block",
    "flex",
    "grid",
    "translate-x-full",
    "translate-x-0",
    "scale-100",
    "scale-105",
    "scale-110",
    "rotate-180",
    "overflow-hidden",
    "overflow-visible"
  ],
  theme: {
    extend: {}
  },
  plugins: []
};

export default config;
