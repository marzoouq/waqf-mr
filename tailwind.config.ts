export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        arabic: ['Tajawal', 'sans-serif'],
        display: ['Amiri', 'serif'],
      },
      colors: {
        border: 'hsl(40 20% 88%)',
        input: 'hsl(40 20% 88%)',
        ring: 'hsl(158 64% 25%)',
        background: 'hsl(40 30% 98%)',
        foreground: 'hsl(150 30% 15%)',
        primary: {
          DEFAULT: 'hsl(158 64% 25%)',
          foreground: 'hsl(40 30% 98%)',
        },
        secondary: {
          DEFAULT: 'hsl(43 74% 49%)',
          foreground: 'hsl(150 30% 15%)',
        },
        destructive: {
          DEFAULT: 'hsl(0 84% 60%)',
          foreground: 'hsl(0 0% 100%)',
        },
        muted: {
          DEFAULT: 'hsl(40 20% 94%)',
          foreground: 'hsl(150 15% 45%)',
        },
        accent: {
          DEFAULT: 'hsl(158 45% 92%)',
          foreground: 'hsl(158 64% 25%)',
        },
        popover: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(150 30% 15%)',
        },
        card: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(150 30% 15%)',
        },
        sidebar: {
          DEFAULT: 'hsl(158 64% 22%)',
          foreground: 'hsl(40 30% 98%)',
          primary: 'hsl(43 74% 49%)',
          'primary-foreground': 'hsl(150 30% 15%)',
          accent: 'hsl(158 50% 30%)',
          'accent-foreground': 'hsl(40 30% 98%)',
          border: 'hsl(158 50% 30%)',
          ring: 'hsl(43 74% 49%)',
        },
        success: {
          DEFAULT: 'hsl(158 64% 40%)',
          foreground: 'hsl(158 64% 25%)',
          muted: 'hsl(158 50% 94%)',
        },
        warning: {
          DEFAULT: 'hsl(43 90% 55%)',
          foreground: 'hsl(43 90% 40%)',
        },
        info: {
          DEFAULT: 'hsl(200 80% 50%)',
          foreground: 'hsl(200 80% 35%)',
          muted: 'hsl(200 60% 94%)',
        },
        discount: {
          DEFAULT: 'hsl(145 60% 40%)',
          foreground: 'hsl(145 60% 28%)',
          muted: 'hsl(145 40% 96%)',
        },
        surcharge: {
          DEFAULT: 'hsl(25 90% 50%)',
          foreground: 'hsl(25 90% 35%)',
          muted: 'hsl(25 60% 96%)',
        },
        'star-rating': 'hsl(43 96% 56%)',
        'status-approved': {
          DEFAULT: 'hsl(217 91% 60%)',
          foreground: 'hsl(217 91% 45%)',
        },
        'status-special': {
          DEFAULT: 'hsl(270 60% 55%)',
          foreground: 'hsl(270 60% 45%)',
        },
        caution: {
          DEFAULT: 'hsl(38 92% 50%)',
          foreground: 'hsl(32 95% 40%)',
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "calc(0.75rem - 2px)",
        sm: "calc(0.75rem - 4px)",
      },
      boxShadow: {
        'sm': '0 1px 2px 0 hsl(150 30% 15% / 0.05)',
        'DEFAULT': '0 4px 6px -1px hsl(150 30% 15% / 0.1)',
        'lg': '0 10px 25px -3px hsl(150 30% 15% / 0.15)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-right": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.5s ease-out forwards",
        "slide-right": "slide-right 0.5s ease-out forwards",
        "slide-down": "slide-down 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};
