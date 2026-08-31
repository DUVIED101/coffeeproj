import type { Config } from "tailwindcss";
import { COLORS, RADII, SPACING } from "@bystrobarista/core/config/constants";

// Design tokens come straight from the RN app's constants so the web palette
// can never drift from mobile. Tailwind's jiti loader compiles the core TS
// import at config-eval time.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: COLORS.primary,
        secondary: COLORS.secondary,
        accent: COLORS.accent,
        "bg-secondary": COLORS.backgroundSecondary,
        ink: COLORS.text,
        "ink-secondary": COLORS.textSecondary,
        line: COLORS.border,
        success: COLORS.success,
        error: COLORS.error,
        warning: COLORS.warning,
      },
      borderRadius: {
        card: `${RADII.card}px`,
        input: `${RADII.input}px`,
        chip: `${RADII.chipSmall}px`,
      },
      spacing: {
        "bb-xs": `${SPACING.xs}px`,
        "bb-sm": `${SPACING.sm}px`,
        "bb-md": `${SPACING.md}px`,
        "bb-lg": `${SPACING.lg}px`,
        "bb-xl": `${SPACING.xl}px`,
        "bb-xxl": `${SPACING.xxl}px`,
        "bb-xxxl": `${SPACING.xxxl}px`,
      },
    },
  },
  plugins: [],
};

export default config;
