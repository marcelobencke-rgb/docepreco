/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './index.html',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        "on-primary-fixed": "#3e0500",
        "surface-bright": "#faf0ed",
        "on-secondary": "#ffffff",
        "on-primary-fixed-variant": "#802918",
        "primary-container": "#f8b8c4",
        "primary": "#e87a8c",
        "surface-container-low": "#fff0ee",
        "surface-container-high": "#e8d5d1",
        "error-container": "#ffdad6",
        "on-tertiary-fixed-variant": "#534600",
        "on-tertiary-container": "#4b3f00",
        "on-error-container": "#93000a",
        "background": "#faf0ed",
        "inverse-surface": "#392e2b",
        "surface-container-highest": "#e8d5d1",
        "on-secondary-fixed": "#2e1506",
        "surface-tint": "#e87a8c",
        "on-tertiary": "#ffffff",
        "secondary-fixed": "#ffdbca",
        "primary-fixed-dim": "#ffb4a5",
        "on-tertiary-fixed": "#221b00",
        "surface-dim": "#e9d6d2",
        "surface-container": "#f1dfdb",
        "surface-container-lowest": "#ffffff",
        "outline": "#89726d",
        "on-secondary-fixed-variant": "#603f2d",
        "primary-fixed": "#ffdad3",
        "on-primary-container": "#4a0b16",
        "on-primary": "#ffffff",
        "on-surface": "#4a2b23",
        "tertiary-fixed": "#fbe278",
        "tertiary-container": "#c1ab47",
        "inverse-primary": "#ffb4a5",
        "on-surface-variant": "#8c6b65",
        "tertiary": "#6e5d00",
        "tertiary-fixed-dim": "#dec65f",
        "inverse-on-surface": "#ffede9",
        "secondary": "#4a2b23",
        "surface": "#faf0ed",
        "on-background": "#4a2b23",
        "secondary-container": "#d2b7b0",
        "on-secondary-container": "#2c140d",
        "secondary-fixed-dim": "#ecbda4",
        "on-error": "#ffffff",
        "outline-variant": "#d2b7b0",
        "surface-variant": "#e8d5d1",
        "error": "#ba1a1a",
        
        // Aliases for shadcn components to not break entirely out of the box
        border: "#d2b7b0", // outline-variant
        input: "#d2b7b0",
        ring: "#e87a8c", // primary
        foreground: "#4a2b23", // on-background
        destructive: {
          DEFAULT: "#ba1a1a", // error
          foreground: "#ffffff", // on-error
        },
        muted: {
          DEFAULT: "#e8d5d1", // surface-container-high
          foreground: "#8c6b65", // on-surface-variant
        },
        accent: {
          DEFAULT: "#fff0ee", // surface-container-low
          foreground: "#4a2b23", // on-surface
        },
        popover: {
          DEFAULT: "#ffffff", // surface-container-lowest
          foreground: "#4a2b23", // on-surface
        },
        card: {
          DEFAULT: "#ffffff", // surface-container-lowest
          foreground: "#4a2b23", // on-surface
        },
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px",
        // Additional shadcn mappings
        md: "1rem", 
        sm: "0.5rem",
      },
      spacing: {
        "xs": "4px",
        "gutter": "12px",
        "md": "12px",
        "lg": "24px",
        "base": "8px",
        "container-max": "1200px",
        "sm": "10px",
        "xl": "48px"
      },
      fontFamily: {
        sans: ["Comfortaa", "sans-serif"],
        "display-lg-mobile": ["Comfortaa", "sans-serif"],
        "display-lg": ["Comfortaa", "sans-serif"],
        "body-md": ["Comfortaa", "sans-serif"],
        "headline-sm": ["Comfortaa", "sans-serif"],
        "body-lg": ["Comfortaa", "sans-serif"],
        "label-md": ["Comfortaa", "sans-serif"],
        "headline-md": ["Comfortaa", "sans-serif"],
        "label-sm": ["Comfortaa", "sans-serif"],
        "title-lg": ["Comfortaa", "sans-serif"],
        "caption": ["Comfortaa", "sans-serif"],
      },
      fontSize: {
        "display-lg-mobile": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
        "display-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "body-md": ["13px", { "lineHeight": "18px", "fontWeight": "400" }],
        "headline-sm": ["18px", { "lineHeight": "24px", "fontWeight": "600" }],
        "body-lg": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "600" }],
        "headline-md": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
        "label-sm": ["10px", { "lineHeight": "14px", "letterSpacing": "0.05em", "fontWeight": "700" }],
        "title-lg": ["16px", { "lineHeight": "24px", "fontWeight": "600" }],
        "caption": ["10px", { "lineHeight": "14px", "fontWeight": "600" }],
      },
      boxShadow: {
        'soft': '0 4px 12px rgba(232, 122, 140, 0.15)',
        'float': '0 8px 24px rgba(232, 122, 140, 0.2)'
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}
