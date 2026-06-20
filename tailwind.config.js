/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#0E9F6E", "primary-dark": "#047857",
        mint: "#A7F3D0", "mint-bg": "#ECFDF5", accent: "#14B8A6",
        bg: "#F7FAF9", surface: "#FFFFFF", border: "#E5EAE8",
        text: "#0F172A", "text-muted": "#64748B",
        owe: "#EF4444", owed: "#0E9F6E", pending: "#F59E0B", info: "#3B82F6",
      },
    },
  },
  plugins: [],
};
