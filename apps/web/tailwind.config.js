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
        // Surfaces
        ink: "var(--color-ink)",
        "ink-2": "var(--color-ink-2)",
        "ink-3": "var(--color-ink-3)",
        "ink-4": "var(--color-ink-4)",

        // Accent (ONE)
        brass: "var(--color-brass)",
        "brass-light": "var(--color-brass-light)",
        "brass-dim": "var(--color-brass-dim)",

        // Structural / map (not brand accent)
        contour: "var(--color-contour)",
        cyan: "var(--color-cyan)", // legacy alias → contour

        // Text / light surface token
        parchment: "var(--color-parchment)",
        "text-hi": "var(--color-text-hi)",
        "text-mid": "var(--color-text-mid)",
        "text-low": "var(--color-text-low)",
        "text-faint": "var(--color-text-faint)",

        // Semantic status only
        moss: "var(--color-moss)",
        clay: "var(--color-clay)",

        // Lines
        line: "var(--color-line)",
        "line-strong": "var(--color-line-strong)",
        "line-contour": "var(--color-line-contour)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        // voice aliases display (Fraunces removed)
        voice: ["var(--font-voice)", "sans-serif"],
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
      // Parallel design-system scale (do not override Tailwind 1-12 defaults
      // until sections are rebuilt onto ds-* tokens).
      spacing: {
        "ds-1": "var(--space-1)",
        "ds-2": "var(--space-2)",
        "ds-3": "var(--space-3)",
        "ds-4": "var(--space-4)",
        "ds-5": "var(--space-5)",
        "ds-6": "var(--space-6)",
        "ds-7": "var(--space-7)",
        "ds-8": "var(--space-8)",
        "ds-9": "var(--space-9)",
        nav: "var(--nav-h)",
      },
      maxWidth: {
        content: "var(--content-max)",
      },
      borderRadius: {
        control: "var(--radius-control)",
        surface: "var(--radius-surface)",
        card: "var(--radius-surface)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        focus: "var(--shadow-focus)",
      },
      zIndex: {
        base: "var(--z-base)",
        raised: "var(--z-raised)",
        sticky: "var(--z-sticky)",
        nav: "var(--z-nav)",
        overlay: "var(--z-overlay)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
      },
      transitionTimingFunction: {
        "out-expo": "var(--ease-out-expo)",
        "out-soft": "var(--ease-out-soft)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        mid: "var(--duration-mid)",
        slow: "var(--duration-slow)",
      },
      animation: {
        "draw-in": "draw-in 2.6s var(--ease-out-soft) forwards",
        "fade-up": "fade-up 0.6s var(--ease-out-expo) forwards",
      },
      keyframes: {
        "draw-in": {
          from: { strokeDashoffset: "2000" },
          to: { strokeDashoffset: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
