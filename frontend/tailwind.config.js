export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        blue: "var(--blue)",
        "blue-dark": "var(--blue-dark)",
        "blue-pale": "var(--blue-pale)",
        lime: "var(--lime)",
        coral: "var(--coral)",
        green: "var(--green)",
        red: "var(--red)",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Manrope", "sans-serif"],
      },
      boxShadow: {
        soft: "var(--shadow)",
      },
      screens: {
        tablet: { max: "900px" },
        mobile: { max: "620px" },
      },
      keyframes: {
        "rise-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          to: { backgroundPosition: "-220% 0" },
        },
      },
      animation: {
        "rise-in": "rise-in .55s both",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};
