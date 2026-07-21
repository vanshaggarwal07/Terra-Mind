/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Terra-Mind cartographer's studio palette ---
        // Backgrounds
        ink: "var(--color-ink)",          // #0A1A22 — base dark surface
        "ink-2": "var(--color-ink-2)",    // #0F2530 — elevated surface
        "ink-3": "var(--color-ink-3)",    // #142E3A — double-elevated

        // Accents
        cyan: "var(--color-cyan)",              // #6FB8C9 — contour/secondary
        brass: "var(--color-brass)",            // #C89A4C — primary CTA accent
        "brass-light": "var(--color-brass-light)", // #E4C481 — readout text

        // Light surface
        parchment: "var(--color-parchment)",   // #F2ECDE — light mode / text

        // Semantic only — never decorative
        moss: "var(--color-moss)",    // #7A9B76 — positive signal
        clay: "var(--color-clay)",    // #B5623F — risk/caution flag

        // Text levels
        "text-hi": "var(--color-text-hi)",
        "text-mid": "var(--color-text-mid)",
        "text-low": "var(--color-text-low)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        voice: ["var(--font-voice)", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        display: ["56px", { lineHeight: "1.06", letterSpacing: "-0.01em" }],
        "display-md": ["44px", { lineHeight: "1.06", letterSpacing: "-0.01em" }],
        "display-sm": ["32px", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
        body: ["16px", { lineHeight: "1.6" }],
        "data-sm": ["14px", { lineHeight: "1.4" }],
        "data-lg": ["20px", { lineHeight: "1.4" }],
      },
      borderRadius: {
        card: "3px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.5)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      animation: {
        "draw-in": "draw-in 2.6s ease forwards",
        "fade-up": "fade-up 0.5s ease forwards",
      },
      keyframes: {
        "draw-in": {
          from: { strokeDashoffset: "2000" },
          to: { strokeDashoffset: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
