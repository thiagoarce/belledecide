/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        noite: "#16302E",
        azulejo: {
          DEFAULT: "#2F6E7A",
          50: "#EAF2F2",
          100: "#D2E4E5",
          300: "#8FB9BE",
          600: "#2F6E7A",
          700: "#245560",
          800: "#1B4048",
        },
        manga: {
          DEFAULT: "#E1672B",
          600: "#E1672B",
          700: "#C24F1B",
        },
        linho: "#F1F4F1",
        grafite: "#3B4442",
        giz: "#8B958F",
      },
      fontFamily: {
        display: ["Lora", "serif"],
        sans: ["Karla", "system-ui", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "monospace"],
      },
    },
  },
  plugins: [],
};
