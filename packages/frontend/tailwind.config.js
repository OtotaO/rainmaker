/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './src/@/components/ui/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        background: {
          DEFAULT: 'hsl(var(--background))',
          oklch: 'var(--background)',
        },
        'background-secondary': {
          DEFAULT: 'hsl(var(--background-secondary))',
          oklch: 'var(--background-secondary)',
        },
        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
          oklch: 'var(--foreground)',
        },
        'foreground-secondary': {
          DEFAULT: 'hsl(var(--foreground-secondary))',
          oklch: 'var(--foreground-secondary)',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          oklch: 'var(--card)',
          foreground: {
            DEFAULT: 'hsl(var(--card-foreground))',
            oklch: 'var(--card-foreground)',
          }
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          oklch: 'var(--popover)',
          foreground: {
            DEFAULT: 'hsl(var(--popover-foreground))',
            oklch: 'var(--popover-foreground)',
          }
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          oklch: 'var(--primary)',
          foreground: {
            DEFAULT: 'hsl(var(--primary-foreground))',
            oklch: 'var(--primary-foreground)',
          }
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          oklch: 'var(--secondary)',
          foreground: {
            DEFAULT: 'hsl(var(--secondary-foreground))',
            oklch: 'var(--secondary-foreground)',
          }
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          oklch: 'var(--muted)',
          foreground: {
            DEFAULT: 'hsl(var(--muted-foreground))',
            oklch: 'var(--muted-foreground)',
          }
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          oklch: 'var(--accent)',
          foreground: {
            DEFAULT: 'hsl(var(--accent-foreground))',
            oklch: 'var(--accent-foreground)',
          }
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          oklch: 'var(--destructive)',
          foreground: {
            DEFAULT: 'hsl(var(--destructive-foreground))',
            oklch: 'var(--destructive-foreground)',
          }
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          oklch: 'var(--border)',
        },
        input: {
          DEFAULT: 'hsl(var(--input))',
          oklch: 'var(--input)',
        },
        ring: {
          DEFAULT: 'hsl(var(--ring))',
          oklch: 'var(--ring)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        heading: ['var(--font-heading)'],
        mono: ['var(--font-mono)'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
