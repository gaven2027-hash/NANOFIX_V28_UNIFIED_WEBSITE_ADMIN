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
    "text-activeBlue",
    "border-activeBlue",
    "focus:border-activeBlue",
    "hover:bg-blue-700",
    "shadow-soft"
  ],
  theme: {
    extend: {
      colors: {
        adminBg: "#F4F7FC",
        sidebar: "#1E293B",
        activeBlue: "#2563EB"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
