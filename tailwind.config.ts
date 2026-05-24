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
    "overflow-visible",
    "bg-adminBg",
    "bg-sidebar",
    "bg-activeBlue",
    "border-activeBlue",
    "text-activeBlue",
    "hover:bg-blue-700"
  ],
  theme: {
    extend: {
      colors: {
        adminBg: "#F4F7FC",
        sidebar: "#1E293B",
        activeBlue: "#2563EB"
      }
    }
  },
  plugins: []
};

export default config;
