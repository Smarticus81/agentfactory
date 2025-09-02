import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'h1': ['32px', { lineHeight: '1.2', letterSpacing: '-0.025em', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '1.4', letterSpacing: '-0.015em', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.6' }],
        'body-lg': ['18px', { lineHeight: '1.6' }],
        'small': ['14px', { lineHeight: '1.5', fontWeight: '500' }],
        'label': ['13px', { lineHeight: '1.5', fontWeight: '500', letterSpacing: '0.01em' }],
      },
      colors: {
        // Design System Colors
        canvas: {
          DEFAULT: '#F7F6FB',
          dark: '#0F1220',
        },
        panel: {
          DEFAULT: '#FFFFFF',
          dark: '#151826',
        },
        border: {
          DEFAULT: '#EAECF0',
          dark: 'rgba(255, 255, 255, 0.08)',
        },
        text: {
          primary: '#2B2F3A',
          secondary: '#6B7280',
          'primary-dark': '#E7E9EF',
          'secondary-dark': '#A6AEC2',
        },
        accent: {
          DEFAULT: '#6D5EF8',
          hover: '#5D4EE8',
          light: 'rgba(109, 94, 248, 0.1)',
          border: 'rgba(109, 94, 248, 0.2)',
        },
        // Gradient colors
        gradient: {
          pink: '#FF8BD6',
          orange: '#FFB070',
          purple: '#7C67FF',
          cyan: '#74D4FF',
          'pink-dark': '#E67AC0',
          'orange-dark': '#E69D64',
          'purple-dark': '#6E5BE6',
          'cyan-dark': '#68BFDB',
        },
        // Semantic Colors (muted)
        success: {
          DEFAULT: '#86EFAC',
          text: '#14532D',
          dark: '#065F46',
          'text-dark': '#86EFAC',
        },
        warning: {
          DEFAULT: '#FDE68A',
          text: '#713F12',
          dark: '#713F12',
          'text-dark': '#FDE68A',
        },
        error: {
          DEFAULT: '#FCA5A5',
          text: '#7F1D1D',
          dark: '#7F1D1D',
          'text-dark': '#FCA5A5',
        },
        // Legacy support
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        'sm': '6px',
        'DEFAULT': '12px',
        'lg': '20px',
        'pill': '9999px',
        md: "calc(var(--radius) - 2px)",
      },
      boxShadow: {
        'card': '0 1px 2px rgba(16, 24, 40, 0.04), 0 6px 16px rgba(16, 24, 40, 0.06)',
        'card-hover': '0 2px 4px rgba(16, 24, 40, 0.06), 0 8px 20px rgba(16, 24, 40, 0.08)',
        'button': '0 1px 2px rgba(16, 24, 40, 0.05)',
        'button-hover': '0 2px 4px rgba(16, 24, 40, 0.06)',
        'dialog': '0 4px 8px rgba(0, 0, 0, 0.08), 0 12px 24px rgba(0, 0, 0, 0.08)',
      },
      spacing: {
        '18': '72px',
        '88': '352px',
        '280': '280px',
      },
      width: {
        'sidebar': '280px',
      },
      maxWidth: {
        'container': '1200px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.2, 0.7, 0.2, 1)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #FF8BD6, #FFB070 35%, #7C67FF 70%, #74D4FF)',
        'gradient-brand-dark': 'linear-gradient(135deg, #E67AC0, #E69D64 35%, #6E5BE6 70%, #68BFDB)',
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
        "lift": {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-2px)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "lift": "lift 0.18s cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;