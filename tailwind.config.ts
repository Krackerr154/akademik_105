import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // The Modern Scriptorium — Surface Hierarchy
                surface: {
                    DEFAULT: "#faf9f7",
                    "container-lowest": "#ffffff",
                    "container-low": "#f4f3f1",
                    "container-high": "#e9e8e6",
                    "container-highest": "#e3e2e0",
                },
                // Core palette
                primary: {
                    DEFAULT: "#091526",
                    fixed: "#d7e3fa",
                },
                secondary: {
                    DEFAULT: "#086b5b",
                    container: "#9eefdc",
                },
                "on-secondary": {
                    DEFAULT: "#ffffff",
                    container: "#126f60",
                },
                "on-surface": "#1a1c1b",
                "outline-variant": "#c5c6cd",
                // Status / Highlight
                "tertiary-fixed-dim": "#ffb77d",
            },
            fontFamily: {
                display: ["Manrope", "system-ui", "sans-serif"],
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["Fira Code", "monospace"],
            },
            borderRadius: {
                sm: "0.25rem",
                md: "0.75rem",
            },
            boxShadow: {
                ambient:
                    "0 4px 24px 0 rgba(26, 28, 27, 0.04)",
            },
        },
    },
    plugins: [],
};
export default config;
