/**
 * ThemeToggle - A self-contained React theme toggle component
 * 
 * @example
 * // 1. Copy this file into your components directory
 * // 2. Import and use the component:
 * 
 * import { ThemeToggle } from './components/ThemeToggle';
 * 
 * function App() {
 *   return (
 *     <div>
 *       <ThemeToggle />
 *       {/* Your app content *\/}
 *     </div>
 *   );
 * }
 * 
 * @description
 * Features:
 * - Zero external dependencies (except React)
 * - Self-contained CSS variables and styles
 * - Persists theme preference in localStorage
 * - Respects system color scheme preferences
 * - Smooth theme transitions
 * - Fully accessible
 * 
 * Using the theme:
 * The component provides CSS variables you can use in your styles:
 * 
 * ```css
 * // Example usage in your CSS:
 * .your-component {
 *   background-color: var(--bg-primary);
 *   color: var(--text-primary);
 *   border: 1px solid var(--border-color);
 *   box-shadow: var(--shadow-sm);
 * }
 * ```
 * 
 * Available Variables:
 * 
 * Light Mode:
 * - --bg-primary: #ffffff
 * - --bg-secondary: #f9fafb
 * - --text-primary: #111827
 * - --text-secondary: #374151
 * - --accent-primary: #3b82f6
 * - --accent-secondary: #60a5fa
 * - --border-color: #e5e7eb
 * - --shadow-sm: [subtle shadow]
 * - --shadow-md: [medium shadow]
 * - --shadow-lg: [large shadow]
 * 
 * Dark Mode: (applied automatically)
 * - --bg-primary: #111827
 * - --bg-secondary: #1f2937
 * - --text-primary: #f9fafb
 * - --text-secondary: #e5e7eb
 * - --accent-primary: #60a5fa
 * - --accent-secondary: #93c5fd
 * - --border-color: #374151
 * - --shadow-[sm/md/lg]: [darker shadows]
 */

import React, { useState, useEffect } from 'react';

// Theme types
type ThemeVariableSet = {
  background: string;
  'background-secondary': string;
  foreground: string;
  'foreground-secondary': string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  border: string;
  input: string;
  ring: string;
  radius?: string;
};

type ThemeDefinition = {
  name: string;
  font: {
    sans: string;
    heading: string;
    mono: string;
  };
  colors: {
    light: ThemeVariableSet;
    dark: ThemeVariableSet;
  };
};

// Available themes
const COLOR_THEMES = [
  {
    name: 'Default',
    font: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      heading: "'Cal Sans', 'Inter', sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    colors: {
      light: {
        background: 'hsl(0 0% 100%)',
        'background-secondary': 'hsl(210 40% 98%)',
        foreground: 'hsl(222.2 84% 4.9%)',
        'foreground-secondary': 'hsl(215.4 16.3% 46.9%)',
        primary: 'hsl(221.2 83.2% 53.3%)',
        'primary-foreground': 'hsl(210 40% 98%)',
        secondary: 'hsl(210 40% 96.1%)',
        'secondary-foreground': 'hsl(222.2 47.4% 11.2%)',
        muted: 'hsl(210 40% 96.1%)',
        'muted-foreground': 'hsl(215.4 16.3% 46.9%)',
        accent: 'hsl(210 40% 96.1%)',
        'accent-foreground': 'hsl(222.2 47.4% 11.2%)',
        border: 'hsl(214.3 31.8% 91.4%)',
        input: 'hsl(214.3 31.8% 91.4%)',
        ring: 'hsl(221.2 83.2% 53.3%)',
        radius: '0.5rem',
      },
      dark: {
        background: 'hsl(222.2 84% 4.9%)',
        'background-secondary': 'hsl(222.2 47.4% 11.2%)',
        foreground: 'hsl(210 40% 98%)',
        'foreground-secondary': 'hsl(215 20.2% 65.1%)',
        primary: 'hsl(217.2 91.2% 59.8%)',
        'primary-foreground': 'hsl(222.2 47.4% 11.2%)',
        secondary: 'hsl(217.2 32.6% 17.5%)',
        'secondary-foreground': 'hsl(210 40% 98%)',
        muted: 'hsl(217.2 32.6% 17.5%)',
        'muted-foreground': 'hsl(215 20.2% 65.1%)',
        accent: 'hsl(217.2 32.6% 17.5%)',
        'accent-foreground': 'hsl(210 40% 98%)',
        border: 'hsl(217.2 32.6% 17.5%)',
        input: 'hsl(217.2 32.6% 17.5%)',
        ring: 'hsl(224.3 76.3% 48%)',
      }
    }
  },
  {
    name: 'Claude',
    font: {
      sans: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
      heading: "var(--font-sans)",
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
    colors: {
      light: {
        background: 'oklch(0.98 0.01 95.10)',
        foreground: 'oklch(0.34 0.03 95.72)',
        card: 'oklch(0.98 0.01 95.10)',
        'card-foreground': 'oklch(0.19 0.00 106.59)',
        popover: 'oklch(1.00 0 0)',
        'popover-foreground': 'oklch(0.27 0.02 98.94)',
        primary: 'oklch(0.62 0.14 39.04)',
        'primary-foreground': 'oklch(1.00 0 0)',
        secondary: 'oklch(0.92 0.01 92.99)',
        'secondary-foreground': 'oklch(0.43 0.02 98.60)',
        muted: 'oklch(0.93 0.02 90.24)',
        'muted-foreground': 'oklch(0.61 0.01 97.42)',
        accent: 'oklch(0.92 0.01 92.99)',
        'accent-foreground': 'oklch(0.27 0.02 98.94)',
        destructive: 'oklch(0.19 0.00 106.59)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0.88 0.01 97.36)',
        input: 'oklch(0.76 0.02 98.35)',
        ring: 'oklch(0.59 0.17 253.06)',
        'chart-1': 'oklch(0.56 0.13 43.00)',
        'chart-2': 'oklch(0.69 0.16 290.41)',
        'chart-3': 'oklch(0.88 0.03 93.13)',
        'chart-4': 'oklch(0.88 0.04 298.18)',
        'chart-5': 'oklch(0.56 0.13 42.06)',
        sidebar: 'oklch(0.97 0.01 98.88)',
        'sidebar-foreground': 'oklch(0.36 0.01 106.65)',
        'sidebar-primary': 'oklch(0.62 0.14 39.04)',
        'sidebar-primary-foreground': 'oklch(0.99 0 0)',
        'sidebar-accent': 'oklch(0.92 0.01 92.99)',
        'sidebar-accent-foreground': 'oklch(0.33 0 0)',
        'sidebar-border': 'oklch(0.94 0 0)',
        'sidebar-ring': 'oklch(0.77 0 0)',
        'font-sans': "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
        'font-serif': 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        'font-mono': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        radius: '0.5rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      },
      dark: {
        background: 'oklch(0.27 0.00 106.64)',
        foreground: 'oklch(0.81 0.01 93.01)',
        card: 'oklch(0.27 0.00 106.64)',
        'card-foreground': 'oklch(0.98 0.01 95.10)',
        popover: 'oklch(0.31 0.00 106.60)',
        'popover-foreground': 'oklch(0.92 0.00 106.48)',
        primary: 'oklch(0.67 0.13 38.76)',
        'primary-foreground': 'oklch(1.00 0 0)',
        secondary: 'oklch(0.98 0.01 95.10)',
        'secondary-foreground': 'oklch(0.31 0.00 106.60)',
        muted: 'oklch(0.22 0.00 106.71)',
        'muted-foreground': 'oklch(0.77 0.02 99.07)',
        accent: 'oklch(0.21 0.01 95.42)',
        'accent-foreground': 'oklch(0.97 0.01 98.88)',
        destructive: 'oklch(0.64 0.21 25.33)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0.36 0.01 106.89)',
        input: 'oklch(0.43 0.01 100.22)',
        ring: 'oklch(0.59 0.17 253.06)',
        'chart-1': 'oklch(0.56 0.13 43.00)',
        'chart-2': 'oklch(0.69 0.16 290.41)',
        'chart-3': 'oklch(0.21 0.01 95.42)',
        'chart-4': 'oklch(0.31 0.05 289.32)',
        'chart-5': 'oklch(0.56 0.13 42.06)',
        sidebar: 'oklch(0.24 0.00 67.71)',
        'sidebar-foreground': 'oklch(0.81 0.01 93.01)',
        'sidebar-primary': 'oklch(0.33 0 0)',
        'sidebar-primary-foreground': 'oklch(0.99 0 0)',
        'sidebar-accent': 'oklch(0.17 0.00 106.62)',
        'sidebar-accent-foreground': 'oklch(0.81 0.01 93.01)',
        'sidebar-border': 'oklch(0.94 0 0)',
        'sidebar-ring': 'oklch(0.77 0 0)',
        'font-sans': "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
        'font-serif': 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        'font-mono': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        radius: '0.5rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      }
    }
  },
  {
    name: 'Forest',
    font: {
      sans: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      heading: "'Sora', 'Outfit', sans-serif",
      mono: "'Fira Code', monospace",
    },
    colors: {
      light: {
        background: 'hsl(0 0% 100%)',
        'background-secondary': 'hsl(150 40% 98%)',
        foreground: 'hsl(162 84% 4.9%)',
        'foreground-secondary': 'hsl(155 16.3% 46.9%)',
        primary: 'hsl(142.1 76.2% 36.3%)',
        'primary-foreground': 'hsl(355.7 100% 97.3%)',
        secondary: 'hsl(150 40% 96.1%)',
        'secondary-foreground': 'hsl(162 47.4% 11.2%)',
        muted: 'hsl(150 40% 96.1%)',
        'muted-foreground': 'hsl(155 16.3% 46.9%)',
        accent: 'hsl(150 40% 96.1%)',
        'accent-foreground': 'hsl(162 47.4% 11.2%)',
        border: 'hsl(154.3 31.8% 91.4%)',
        input: 'hsl(154.3 31.8% 91.4%)',
        ring: 'hsl(142.1 76.2% 36.3%)',
        radius: '0.75rem',
      },
      dark: {
        background: 'hsl(162 84% 4.9%)',
        'background-secondary': 'hsl(162 47.4% 11.2%)',
        foreground: 'hsl(150 40% 98%)',
        'foreground-secondary': 'hsl(155 20.2% 65.1%)',
        primary: 'hsl(142.1 70.6% 45.3%)',
        'primary-foreground': 'hsl(162 47.4% 11.2%)',
        secondary: 'hsl(157.2 32.6% 17.5%)',
        'secondary-foreground': 'hsl(150 40% 98%)',
        muted: 'hsl(157.2 32.6% 17.5%)',
        'muted-foreground': 'hsl(155 20.2% 65.1%)',
        accent: 'hsl(157.2 32.6% 17.5%)',
        'accent-foreground': 'hsl(150 40% 98%)',
        border: 'hsl(157.2 32.6% 17.5%)',
        input: 'hsl(157.2 32.6% 17.5%)',
        ring: 'hsl(142.1 70.6% 45.3%)',
      }
    }
  },
  {
    name: 'Sunset',
    font: {
      sans: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      heading: "'Clash Display', 'DM Sans', sans-serif",
      mono: "'IBM Plex Mono', monospace",
    },
    colors: {
      light: {
        background: 'hsl(0 0% 100%)',
        'background-secondary': 'hsl(30 40% 98%)',
        foreground: 'hsl(32 84% 4.9%)',
        'foreground-secondary': 'hsl(25 16.3% 46.9%)',
        primary: 'hsl(20.5 90.2% 48.2%)',
        'primary-foreground': 'hsl(355.7 100% 97.3%)',
        secondary: 'hsl(30 40% 96.1%)',
        'secondary-foreground': 'hsl(32 47.4% 11.2%)',
        muted: 'hsl(30 40% 96.1%)',
        'muted-foreground': 'hsl(25 16.3% 46.9%)',
        accent: 'hsl(30 40% 96.1%)',
        'accent-foreground': 'hsl(32 47.4% 11.2%)',
        border: 'hsl(24.3 31.8% 91.4%)',
        input: 'hsl(24.3 31.8% 91.4%)',
        ring: 'hsl(20.5 90.2% 48.2%)',
        radius: '0.25rem',
      },
      dark: {
        background: 'hsl(32 84% 4.9%)',
        'background-secondary': 'hsl(32 47.4% 11.2%)',
        foreground: 'hsl(30 40% 98%)',
        'foreground-secondary': 'hsl(25 20.2% 65.1%)',
        primary: 'hsl(20.5 90.2% 48.2%)',
        'primary-foreground': 'hsl(32 47.4% 11.2%)',
        secondary: 'hsl(27.2 32.6% 17.5%)',
        'secondary-foreground': 'hsl(30 40% 98%)',
        muted: 'hsl(27.2 32.6% 17.5%)',
        'muted-foreground': 'hsl(25 20.2% 65.1%)',
        accent: 'hsl(27.2 32.6% 17.5%)',
        'accent-foreground': 'hsl(30 40% 98%)',
        border: 'hsl(27.2 32.6% 17.5%)',
        input: 'hsl(27.2 32.6% 17.5%)',
        ring: 'hsl(20.5 90.2% 48.2%)',
      }
    }
  },
  {
    name: 'Rose',
    font: {
      sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      heading: "'Cabinet Grotesk', 'Plus Jakarta Sans', sans-serif",
      mono: "'Cascadia Code', monospace",
    },
    colors: {
      light: {
        background: 'hsl(0 0% 100%)',
        'background-secondary': 'hsl(350 40% 98%)',
        foreground: 'hsl(352 84% 4.9%)',
        'foreground-secondary': 'hsl(345 16.3% 46.9%)',
        primary: 'hsl(346.8 77.2% 49.8%)',
        'primary-foreground': 'hsl(355.7 100% 97.3%)',
        secondary: 'hsl(350 40% 96.1%)',
        'secondary-foreground': 'hsl(352 47.4% 11.2%)',
        muted: 'hsl(350 40% 96.1%)',
        'muted-foreground': 'hsl(345 16.3% 46.9%)',
        accent: 'hsl(350 40% 96.1%)',
        'accent-foreground': 'hsl(352 47.4% 11.2%)',
        border: 'hsl(344.3 31.8% 91.4%)',
        input: 'hsl(344.3 31.8% 91.4%)',
        ring: 'hsl(346.8 77.2% 49.8%)',
        radius: '1rem',
      },
      dark: {
        background: 'hsl(352 84% 4.9%)',
        'background-secondary': 'hsl(352 47.4% 11.2%)',
        foreground: 'hsl(350 40% 98%)',
        'foreground-secondary': 'hsl(345 20.2% 65.1%)',
        primary: 'hsl(346.8 77.2% 49.8%)',
        'primary-foreground': 'hsl(352 47.4% 11.2%)',
        secondary: 'hsl(347.2 32.6% 17.5%)',
        'secondary-foreground': 'hsl(350 40% 98%)',
        muted: 'hsl(347.2 32.6% 17.5%)',
        'muted-foreground': 'hsl(345 20.2% 65.1%)',
        accent: 'hsl(347.2 32.6% 17.5%)',
        'accent-foreground': 'hsl(350 40% 98%)',
        border: 'hsl(347.2 32.6% 17.5%)',
        input: 'hsl(347.2 32.6% 17.5%)',
        ring: 'hsl(346.8 77.2% 49.8%)',
      }
    }
  },
  {
    name: 'Zinc',
    font: {
      sans: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      heading: "'SF Pro Display', sans-serif",
      mono: "'SF Mono', monospace",
    },
    colors: {
      light: {
        background: 'hsl(0 0% 100%)',
        'background-secondary': 'hsl(240 3.7% 97.5%)',
        foreground: 'hsl(240 5.9% 10%)',
        'foreground-secondary': 'hsl(240 3.8% 46.1%)',
        primary: 'hsl(240 5.9% 10%)',
        'primary-foreground': 'hsl(0 0% 98%)',
        secondary: 'hsl(240 4.8% 95.9%)',
        'secondary-foreground': 'hsl(240 5.9% 10%)',
        muted: 'hsl(240 4.8% 95.9%)',
        'muted-foreground': 'hsl(240 3.8% 46.1%)',
        accent: 'hsl(240 4.8% 95.9%)',
        'accent-foreground': 'hsl(240 5.9% 10%)',
        border: 'hsl(240 5.9% 90%)',
        radius: '0.25rem',
      },
      dark: {
        background: 'hsl(240 5.9% 10%)',
        'background-secondary': 'hsl(240 3.7% 15.9%)',
        foreground: 'hsl(0 0% 98%)',
        'foreground-secondary': 'hsl(240 5% 64.9%)',
        primary: 'hsl(0 0% 98%)',
        'primary-foreground': 'hsl(240 5.9% 10%)',
        secondary: 'hsl(240 3.7% 15.9%)',
        'secondary-foreground': 'hsl(0 0% 98%)',
        muted: 'hsl(240 3.7% 15.9%)',
        'muted-foreground': 'hsl(240 5% 64.9%)',
        accent: 'hsl(240 3.7% 15.9%)',
        'accent-foreground': 'hsl(0 0% 98%)',
        border: 'hsl(240 3.7% 15.9%)',
      }
    }
  },
  {
    name: 'Nord',
    font: {
      sans: "'Rubik', -apple-system, BlinkMacSystemFont, sans-serif",
      heading: "'Rubik', sans-serif",
      mono: "'Fira Code', monospace",
    },
    colors: {
      light: {
        background: 'hsl(220, 16%, 96%)',
        'background-secondary': 'hsl(220, 16%, 92%)',
        foreground: 'hsl(222, 16%, 28%)',
        'foreground-secondary': 'hsl(220, 9%, 46%)',
        primary: 'hsl(213, 32%, 52%)',
        'primary-foreground': 'hsl(220, 16%, 96%)',
        secondary: 'hsl(220, 16%, 92%)',
        'secondary-foreground': 'hsl(222, 16%, 28%)',
        muted: 'hsl(220, 16%, 92%)',
        'muted-foreground': 'hsl(220, 9%, 46%)',
        accent: 'hsl(179, 25%, 65%)',
        'accent-foreground': 'hsl(222, 16%, 28%)',
        border: 'hsl(220, 13%, 91%)',
        radius: '0.375rem',
      },
      dark: {
        background: 'hsl(220, 16%, 22%)',
        'background-secondary': 'hsl(222, 16%, 28%)',
        foreground: 'hsl(219, 28%, 88%)',
        'foreground-secondary': 'hsl(220, 9%, 64%)',
        primary: 'hsl(210, 34%, 63%)',
        'primary-foreground': 'hsl(222, 16%, 28%)',
        secondary: 'hsl(222, 16%, 28%)',
        'secondary-foreground': 'hsl(219, 28%, 88%)',
        muted: 'hsl(222, 16%, 28%)',
        'muted-foreground': 'hsl(220, 9%, 64%)',
        accent: 'hsl(179, 25%, 65%)',
        'accent-foreground': 'hsl(219, 28%, 88%)',
        border: 'hsl(222, 16%, 28%)',
      }
    }
  },
  {
    name: 'Slate',
    font: {
      sans: "'Work Sans', system-ui, sans-serif",
      heading: "'Work Sans', system-ui, sans-serif",
      mono: "'Roboto Mono', monospace",
    },
    colors: {
      light: {
        background: 'hsl(0 0% 100%)',
        'background-secondary': 'hsl(210 40% 98%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
        'foreground-secondary': 'hsl(215.4 16.3% 46.9%)',
        primary: 'hsl(222.2 47.4% 11.2%)',
        'primary-foreground': 'hsl(210 40% 98%)',
        secondary: 'hsl(210 40% 96.1%)',
        'secondary-foreground': 'hsl(222.2 47.4% 11.2%)',
        muted: 'hsl(210 40% 96.1%)',
        'muted-foreground': 'hsl(215.4 16.3% 46.9%)',
        accent: 'hsl(210 40% 96.1%)',
        'accent-foreground': 'hsl(222.2 47.4% 11.2%)',
        border: 'hsl(214.3 31.8% 91.4%)',
        radius: '0.75rem',
      },
      dark: {
        background: 'hsl(222.2 84% 4.9%)',
        'background-secondary': 'hsl(222.2 47.4% 11.2%)',
        foreground: 'hsl(210 40% 98%)',
        'foreground-secondary': 'hsl(215 20.2% 65.1%)',
        primary: 'hsl(210 40% 98%)',
        'primary-foreground': 'hsl(222.2 47.4% 11.2%)',
        secondary: 'hsl(217.2 32.6% 17.5%)',
        'secondary-foreground': 'hsl(210 40% 98%)',
        muted: 'hsl(217.2 32.6% 17.5%)',
        'muted-foreground': 'hsl(215 20.2% 65.1%)',
        accent: 'hsl(217.2 32.6% 17.5%)',
        'accent-foreground': 'hsl(210 40% 98%)',
        border: 'hsl(217.2 32.6% 17.5%)',
      }
    }
  },
  {
    name: 'Ocean',
    font: {
      sans: "'Montserrat', sans-serif",
      heading: "'Montserrat', sans-serif",
      mono: "'Fira Code', monospace",
    },
    colors: {
      light: {
        background: 'hsl(200 100% 99%)',
        'background-secondary': 'hsl(200 100% 97%)',
        foreground: 'hsl(200 50% 20%)',
        'foreground-secondary': 'hsl(200 30% 40%)',
        primary: 'hsl(200 100% 45%)',
        'primary-foreground': 'hsl(0 0% 100%)',
        secondary: 'hsl(200 30% 96%)',
        'secondary-foreground': 'hsl(200 50% 20%)',
        muted: 'hsl(200 30% 96%)',
        'muted-foreground': 'hsl(200 30% 40%)',
        accent: 'hsl(180 100% 45%)',
        'accent-foreground': 'hsl(200 50% 20%)',
        border: 'hsl(200 50% 90%)',
        radius: '0.5rem',
      },
      dark: {
        background: 'hsl(200 50% 10%)',
        'background-secondary': 'hsl(200 50% 15%)',
        foreground: 'hsl(200 100% 95%)',
        'foreground-secondary': 'hsl(200 30% 80%)',
        primary: 'hsl(200 100% 60%)',
        'primary-foreground': 'hsl(200 50% 10%)',
        secondary: 'hsl(200 30% 20%)',
        'secondary-foreground': 'hsl(200 100% 95%)',
        muted: 'hsl(200 30% 20%)',
        'muted-foreground': 'hsl(200 30% 80%)',
        accent: 'hsl(180 100% 60%)',
        'accent-foreground': 'hsl(200 100% 95%)',
        border: 'hsl(200 50% 20%)',
      }
    }
  },
  {
    name: 'Vintage',
    font: {
      sans: "'Playfair Display', serif",
      heading: "'Playfair Display', serif",
      mono: "'IBM Plex Mono', monospace",
    },
    colors: {
      light: {
        background: 'hsl(40 30% 98%)',
        'background-secondary': 'hsl(40 30% 96%)',
        foreground: 'hsl(40 40% 20%)',
        'foreground-secondary': 'hsl(40 20% 40%)',
        primary: 'hsl(20 80% 45%)',
        'primary-foreground': 'hsl(40 30% 98%)',
        secondary: 'hsl(40 20% 92%)',
        'secondary-foreground': 'hsl(40 40% 20%)',
        muted: 'hsl(40 20% 92%)',
        'muted-foreground': 'hsl(40 20% 40%)',
        accent: 'hsl(350 80% 45%)',
        'accent-foreground': 'hsl(40 40% 20%)',
        border: 'hsl(40 30% 88%)',
        radius: '0.25rem',
      },
      dark: {
        background: 'hsl(40 40% 12%)',
        'background-secondary': 'hsl(40 40% 16%)',
        foreground: 'hsl(40 30% 90%)',
        'foreground-secondary': 'hsl(40 20% 70%)',
        primary: 'hsl(20 80% 60%)',
        'primary-foreground': 'hsl(40 40% 12%)',
        secondary: 'hsl(40 20% 24%)',
        'secondary-foreground': 'hsl(40 30% 90%)',
        muted: 'hsl(40 20% 24%)',
        'muted-foreground': 'hsl(40 20% 70%)',
        accent: 'hsl(350 80% 60%)',
        'accent-foreground': 'hsl(40 30% 90%)',
        border: 'hsl(40 30% 24%)',
      }
    }
  },
  {
    name: 'Neon',
    font: {
      sans: "'Space Grotesk', sans-serif",
      heading: "'Space Grotesk', sans-serif",
      mono: "'IBM Plex Mono', monospace",
    },
    colors: {
      light: {
        background: 'hsl(0 0% 100%)',
        'background-secondary': 'hsl(0 0% 98%)',
        foreground: 'hsl(260 50% 15%)',
        'foreground-secondary': 'hsl(260 30% 40%)',
        primary: 'hsl(260 100% 60%)',
        'primary-foreground': 'hsl(0 0% 100%)',
        secondary: 'hsl(260 30% 96%)',
        'secondary-foreground': 'hsl(260 50% 15%)',
        muted: 'hsl(260 30% 96%)',
        'muted-foreground': 'hsl(260 30% 40%)',
        accent: 'hsl(320 100% 60%)',
        'accent-foreground': 'hsl(260 50% 15%)',
        border: 'hsl(260 50% 90%)',
        radius: '1rem',
      },
      dark: {
        background: 'hsl(260 50% 10%)',
        'background-secondary': 'hsl(260 50% 15%)',
        foreground: 'hsl(260 100% 95%)',
        'foreground-secondary': 'hsl(260 30% 80%)',
        primary: 'hsl(260 100% 75%)',
        'primary-foreground': 'hsl(260 50% 10%)',
        secondary: 'hsl(260 30% 20%)',
        'secondary-foreground': 'hsl(260 100% 95%)',
        muted: 'hsl(260 30% 20%)',
        'muted-foreground': 'hsl(260 30% 80%)',
        accent: 'hsl(320 100% 75%)',
        'accent-foreground': 'hsl(260 100% 95%)',
        border: 'hsl(260 50% 20%)',
      }
    }
  },
  {
    name: 'Cyberpunk',
    font: {
      sans: "'Orbitron', sans-serif",
      heading: "'Orbitron', sans-serif",
      mono: "'Share Tech Mono', monospace",
    },
    colors: {
      light: {
        background: 'hsl(180 100% 99%)',
        'background-secondary': 'hsl(180 100% 97%)',
        foreground: 'hsl(300 50% 20%)',
        'foreground-secondary': 'hsl(300 30% 40%)',
        primary: 'hsl(300 100% 45%)',
        'primary-foreground': 'hsl(180 100% 99%)',
        secondary: 'hsl(180 30% 96%)',
        'secondary-foreground': 'hsl(300 50% 20%)',
        muted: 'hsl(180 30% 96%)',
        'muted-foreground': 'hsl(300 30% 40%)',
        accent: 'hsl(120 100% 45%)',
        'accent-foreground': 'hsl(300 50% 20%)',
        border: 'hsl(180 50% 90%)',
        radius: '0rem',
      },
      dark: {
        background: 'hsl(300 50% 10%)',
        'background-secondary': 'hsl(300 50% 15%)',
        foreground: 'hsl(120 100% 95%)',
        'foreground-secondary': 'hsl(120 30% 80%)',
        primary: 'hsl(300 100% 60%)',
        'primary-foreground': 'hsl(300 50% 10%)',
        secondary: 'hsl(300 30% 20%)',
        'secondary-foreground': 'hsl(120 100% 95%)',
        muted: 'hsl(300 30% 20%)',
        'muted-foreground': 'hsl(120 30% 80%)',
        accent: 'hsl(120 100% 60%)',
        'accent-foreground': 'hsl(120 100% 95%)',
        border: 'hsl(300 50% 20%)',
      }
    }
  },
  {
    name: 'Base',
    font: {
      sans: "'Supreme', 'Poppins', sans-serif",
      heading: "var(--font-sans)",
      mono: "'Menlo', 'Monaco', 'Consolas', monospace",
    },
    colors: {
      light: {
        background: 'oklch(1.00 0 0)',
        foreground: 'oklch(0.27 0.06 262.62)',
        card: 'oklch(1.00 0 0)',
        'card-foreground': 'oklch(0.27 0.06 262.62)',
        popover: 'oklch(1.00 0 0)',
        'popover-foreground': 'oklch(0.27 0.06 262.62)',
        primary: 'oklch(0.45 0.04 242.50)',
        'primary-foreground': 'oklch(0.98 0.01 240.50)',
        secondary: 'oklch(0.71 0.12 176.50)',
        'secondary-foreground': 'oklch(0.32 0.05 262.62)',
        muted: 'oklch(0.96 0.01 240.50)',
        'muted-foreground': 'oklch(0.61 0.02 251.33)',
        accent: 'oklch(0.86 0.15 92.50)',
        'accent-foreground': 'oklch(0.32 0.05 262.62)',
        destructive: 'oklch(0.63 0.21 25.33)',
        'destructive-foreground': 'oklch(0.98 0.01 240.50)',
        border: 'oklch(0.91 0.02 245.50)',
        input: 'oklch(0.91 0.02 245.50)',
        ring: 'oklch(0.27 0.06 262.62)',
        'chart-1': 'oklch(0.45 0.04 242.50)',
        'chart-2': 'oklch(0.71 0.12 176.50)',
        'chart-3': 'oklch(0.86 0.15 92.50)',
        'chart-4': 'oklch(0.67 0.15 48.50)',
        'chart-5': 'oklch(0.63 0.21 25.33)',
        sidebar: 'oklch(0.98 0.01 240.50)',
        'sidebar-foreground': 'oklch(0.27 0.06 262.62)',
        'sidebar-primary': 'oklch(0.45 0.04 242.50)',
        'sidebar-primary-foreground': 'oklch(0.98 0.01 240.50)',
        'sidebar-accent': 'oklch(0.86 0.15 92.50)',
        'sidebar-accent-foreground': 'oklch(0.32 0.05 262.62)',
        'sidebar-border': 'oklch(0.91 0.02 245.50)',
        'sidebar-ring': 'oklch(0.45 0.04 242.50)',
        'font-sans': 'Supreme, Poppins, sans-serif',
        'font-serif': 'Georgia, Times New Roman, serif',
        'font-mono': 'Menlo, Monaco, Consolas, monospace',
        radius: '0.5rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      },
      dark: {
        background: 'oklch(0.27 0.06 262.62)',
        foreground: 'oklch(0.98 0.01 240.50)',
        card: 'oklch(0.27 0.06 262.62)',
        'card-foreground': 'oklch(0.98 0.01 240.50)',
        popover: 'oklch(0.27 0.06 262.62)',
        'popover-foreground': 'oklch(0.98 0.01 240.50)',
        primary: 'oklch(0.45 0.04 242.50)',
        'primary-foreground': 'oklch(0.98 0.01 240.50)',
        secondary: 'oklch(0.71 0.12 176.50)',
        'secondary-foreground': 'oklch(0.98 0.01 240.50)',
        muted: 'oklch(0.32 0.05 262.62)',
        'muted-foreground': 'oklch(0.72 0.02 251.33)',
        accent: 'oklch(0.86 0.15 92.50)',
        'accent-foreground': 'oklch(0.98 0.01 240.50)',
        destructive: 'oklch(0.35 0.15 25.33)',
        'destructive-foreground': 'oklch(0.98 0.01 240.50)',
        border: 'oklch(0.32 0.05 262.62)',
        input: 'oklch(0.32 0.05 262.62)',
        ring: 'oklch(0.85 0.02 251.33)',
        'chart-1': 'oklch(0.45 0.04 242.50)',
        'chart-2': 'oklch(0.71 0.12 176.50)',
        'chart-3': 'oklch(0.86 0.15 92.50)',
        'chart-4': 'oklch(0.67 0.15 48.50)',
        'chart-5': 'oklch(0.35 0.15 25.33)',
        sidebar: 'oklch(0.27 0.06 262.62)',
        'sidebar-foreground': 'oklch(0.98 0.01 240.50)',
        'sidebar-primary': 'oklch(0.45 0.04 242.50)',
        'sidebar-primary-foreground': 'oklch(0.98 0.01 240.50)',
        'sidebar-accent': 'oklch(0.86 0.15 92.50)',
        'sidebar-accent-foreground': 'oklch(0.98 0.01 240.50)',
        'sidebar-border': 'oklch(0.32 0.05 262.62)',
        'sidebar-ring': 'oklch(0.85 0.02 251.33)',
        'font-sans': 'Supreme, Poppins, sans-serif',
        'font-serif': 'Georgia, Times New Roman, serif',
        'font-mono': 'Menlo, Monaco, Consolas, monospace',
        radius: '0.5rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      }
    }
  },
  {
    name: 'Kodama Grove',
    font: {
      sans: "'Merriweather', serif",
      heading: "'Source Serif 4', serif",
      mono: "'JetBrains Mono', monospace",
    },
    colors: {
      light: {
        background: 'oklch(0.88 0.05 91.79)',
        foreground: 'oklch(0.43 0.03 59.22)',
        card: 'oklch(0.89 0.04 87.57)',
        'card-foreground': 'oklch(0.43 0.03 59.22)',
        popover: 'oklch(0.94 0.03 89.85)',
        'popover-foreground': 'oklch(0.43 0.03 59.22)',
        primary: 'oklch(0.67 0.11 118.91)',
        'primary-foreground': 'oklch(0.99 0.01 88.64)',
        secondary: 'oklch(0.85 0.06 91.15)',
        'secondary-foreground': 'oklch(0.43 0.03 59.22)',
        muted: 'oklch(0.85 0.06 91.15)',
        'muted-foreground': 'oklch(0.58 0.03 60.93)',
        accent: 'oklch(0.84 0.07 90.33)',
        'accent-foreground': 'oklch(0.43 0.03 59.22)',
        destructive: 'oklch(0.71 0.10 29.98)',
        'destructive-foreground': 'oklch(0.98 0.01 91.48)',
        border: 'oklch(0.69 0.04 59.84)',
        input: 'oklch(0.84 0.07 90.33)',
        ring: 'oklch(0.73 0.06 130.85)',
        'chart-1': 'oklch(0.67 0.11 118.91)',
        'chart-2': 'oklch(0.84 0.07 90.33)',
        'chart-3': 'oklch(0.77 0.08 52.30)',
        'chart-4': 'oklch(0.65 0.14 143.32)',
        'chart-5': 'oklch(0.71 0.10 29.98)',
        sidebar: 'oklch(0.89 0.04 87.57)',
        'sidebar-foreground': 'oklch(0.43 0.03 59.22)',
        'sidebar-primary': 'oklch(0.67 0.11 118.91)',
        'sidebar-primary-foreground': 'oklch(0.99 0.01 88.64)',
        'sidebar-accent': 'oklch(0.84 0.07 90.33)',
        'sidebar-accent-foreground': 'oklch(0.43 0.03 59.22)',
        'sidebar-border': 'oklch(0.69 0.04 59.84)',
        'sidebar-ring': 'oklch(0.73 0.06 130.85)',
        'font-sans': "'Merriweather', serif",
        'font-serif': "'Source Serif 4', serif",
        'font-mono': "'JetBrains Mono', monospace",
        radius: '0.425rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      },
      dark: {
        background: 'oklch(0.33 0.02 88.07)',
        foreground: 'oklch(0.92 0.02 82.12)',
        card: 'oklch(0.36 0.02 82.33)',
        'card-foreground': 'oklch(0.92 0.02 82.12)',
        popover: 'oklch(0.36 0.02 82.33)',
        'popover-foreground': 'oklch(0.92 0.02 82.12)',
        primary: 'oklch(0.68 0.06 132.45)',
        'primary-foreground': 'oklch(0.27 0.01 61.02)',
        secondary: 'oklch(0.44 0.02 84.55)',
        'secondary-foreground': 'oklch(0.92 0.02 82.12)',
        muted: 'oklch(0.39 0.02 82.71)',
        'muted-foreground': 'oklch(0.71 0.02 73.62)',
        accent: 'oklch(0.65 0.07 90.76)',
        'accent-foreground': 'oklch(0.27 0.01 61.02)',
        destructive: 'oklch(0.63 0.08 31.30)',
        'destructive-foreground': 'oklch(0.94 0.02 84.59)',
        border: 'oklch(0.44 0.02 84.55)',
        input: 'oklch(0.44 0.02 84.55)',
        ring: 'oklch(0.68 0.06 132.45)',
        'chart-1': 'oklch(0.68 0.06 132.45)',
        'chart-2': 'oklch(0.65 0.07 90.76)',
        'chart-3': 'oklch(0.71 0.06 56.45)',
        'chart-4': 'oklch(0.59 0.10 147.32)',
        'chart-5': 'oklch(0.63 0.08 31.30)',
        sidebar: 'oklch(0.36 0.02 82.33)',
        'sidebar-foreground': 'oklch(0.92 0.02 82.12)',
        'sidebar-primary': 'oklch(0.68 0.06 132.45)',
        'sidebar-primary-foreground': 'oklch(0.27 0.01 61.02)',
        'sidebar-accent': 'oklch(0.65 0.07 90.76)',
        'sidebar-accent-foreground': 'oklch(0.27 0.01 61.02)',
        'sidebar-border': 'oklch(0.44 0.02 84.55)',
        'sidebar-ring': 'oklch(0.68 0.06 132.45)',
        'font-sans': "'Merriweather', serif",
        'font-serif': "'Source Serif 4', serif",
        'font-mono': "'JetBrains Mono', monospace",
        radius: '0.425rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      }
    }
  },
  {
    name: 'Vintage Paper',
    font: {
      sans: "'Libre Baskerville', serif",
      heading: "'Lora', serif",
      mono: "'IBM Plex Mono', monospace",
    },
    colors: {
      light: {
        background: 'oklch(0.96 0.02 90.24)',
        foreground: 'oklch(0.38 0.02 64.34)',
        card: 'oklch(0.99 0.01 87.47)',
        'card-foreground': 'oklch(0.38 0.02 64.34)',
        primary: 'oklch(0.62 0.08 65.54)',
        'primary-foreground': 'oklch(1.00 0 0)',
        secondary: 'oklch(0.88 0.03 85.57)',
        'secondary-foreground': 'oklch(0.43 0.03 64.93)',
        muted: 'oklch(0.92 0.02 83.06)',
        'muted-foreground': 'oklch(0.54 0.04 71.17)',
        accent: 'oklch(0.83 0.04 88.81)',
        'accent-foreground': 'oklch(0.38 0.02 64.34)',
        destructive: 'oklch(0.55 0.14 32.91)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0.86 0.03 84.59)',
        input: 'oklch(0.86 0.03 84.59)',
        ring: 'oklch(0.62 0.08 65.54)',
        'chart-1': 'oklch(0.62 0.08 65.54)',
        'chart-2': 'oklch(0.83 0.04 88.81)',
        'chart-3': 'oklch(0.78 0.06 76.32)',
        'chart-4': 'oklch(0.66 0.10 43.80)',
        'chart-5': 'oklch(0.55 0.14 32.91)',
        sidebar: 'oklch(0.99 0.01 87.47)',
        'sidebar-foreground': 'oklch(0.38 0.02 64.34)',
        'sidebar-primary': 'oklch(0.62 0.08 65.54)',
        'sidebar-primary-foreground': 'oklch(1.00 0 0)',
        'sidebar-accent': 'oklch(0.83 0.04 88.81)',
        'sidebar-accent-foreground': 'oklch(0.38 0.02 64.34)',
        'sidebar-border': 'oklch(0.86 0.03 84.59)',
        'sidebar-ring': 'oklch(0.62 0.08 65.54)',
        'font-sans': "'Libre Baskerville', serif",
        'font-serif': "'Lora', serif",
        'font-mono': "'IBM Plex Mono', monospace",
        radius: '0.25rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      },
      dark: {
        background: 'oklch(0.27 0.01 57.65)',
        foreground: 'oklch(0.92 0.02 83.06)',
        card: 'oklch(0.32 0.02 59.06)',
        'card-foreground': 'oklch(0.92 0.02 83.06)',
        primary: 'oklch(0.73 0.06 66.70)',
        'primary-foreground': 'oklch(0.27 0.01 57.65)',
        secondary: 'oklch(0.38 0.02 57.13)',
        'secondary-foreground': 'oklch(0.92 0.02 83.06)',
        muted: 'oklch(0.32 0.02 59.06)',
        'muted-foreground': 'oklch(0.80 0.02 82.11)',
        accent: 'oklch(0.42 0.03 56.34)',
        'accent-foreground': 'oklch(0.92 0.02 83.06)',
        destructive: 'oklch(0.55 0.14 32.91)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0.38 0.02 57.13)',
        input: 'oklch(0.38 0.02 57.13)',
        ring: 'oklch(0.73 0.06 66.70)',
        'chart-1': 'oklch(0.73 0.06 66.70)',
        'chart-2': 'oklch(0.42 0.03 56.34)',
        'chart-3': 'oklch(0.63 0.05 64.85)',
        'chart-4': 'oklch(0.56 0.11 42.54)',
        'chart-5': 'oklch(0.55 0.14 32.91)',
        sidebar: 'oklch(0.32 0.02 59.06)',
        'sidebar-foreground': 'oklch(0.92 0.02 83.06)',
        'sidebar-primary': 'oklch(0.73 0.06 66.70)',
        'sidebar-primary-foreground': 'oklch(0.27 0.01 57.65)',
        'sidebar-accent': 'oklch(0.42 0.03 56.34)',
        'sidebar-accent-foreground': 'oklch(0.92 0.02 83.06)',
        'sidebar-border': 'oklch(0.38 0.02 57.13)',
        'sidebar-ring': 'oklch(0.73 0.06 66.70)',
        'font-sans': "'Libre Baskerville', serif",
        'font-serif': "'Lora', serif",
        'font-mono': "'IBM Plex Mono', monospace",
        radius: '0.25rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      }
    }
  },
  {
    name: 'Claymorphism',
    font: {
      sans: "'Plus Jakarta Sans', sans-serif",
      heading: "'Lora', serif",
      mono: "'Roboto Mono', monospace",
    },
    colors: {
      light: {
        background: 'oklch(0.92 0.00 48.72)',
        foreground: 'oklch(0.28 0.04 260.03)',
        card: 'oklch(0.97 0.00 106.42)',
        'card-foreground': 'oklch(0.28 0.04 260.03)',
        primary: 'oklch(0.59 0.20 277.12)',
        'primary-foreground': 'oklch(1.00 0 0)',
        secondary: 'oklch(0.87 0.00 56.37)',
        'secondary-foreground': 'oklch(0.45 0.03 256.80)',
        muted: 'oklch(0.92 0.00 48.72)',
        'muted-foreground': 'oklch(0.55 0.02 264.36)',
        accent: 'oklch(0.94 0.03 321.94)',
        'accent-foreground': 'oklch(0.37 0.03 259.73)',
        destructive: 'oklch(0.64 0.21 25.33)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0.87 0.00 56.37)',
        input: 'oklch(0.87 0.00 56.37)',
        ring: 'oklch(0.59 0.20 277.12)',
        'chart-1': 'oklch(0.59 0.20 277.12)',
        'chart-2': 'oklch(0.94 0.03 321.94)',
        'chart-3': 'oklch(0.77 0.15 174.57)',
        'chart-4': 'oklch(0.64 0.13 228.45)',
        'chart-5': 'oklch(0.64 0.21 25.33)',
        sidebar: 'oklch(0.92 0.00 48.72)',
        'sidebar-foreground': 'oklch(0.28 0.04 260.03)',
        'sidebar-primary': 'oklch(0.59 0.20 277.12)',
        'sidebar-primary-foreground': 'oklch(1.00 0 0)',
        'sidebar-accent': 'oklch(0.94 0.03 321.94)',
        'sidebar-accent-foreground': 'oklch(0.37 0.03 259.73)',
        'sidebar-border': 'oklch(0.87 0.00 56.37)',
        'sidebar-ring': 'oklch(0.59 0.20 277.12)',
        'font-sans': "'Plus Jakarta Sans', sans-serif",
        'font-serif': "'Lora', serif",
        'font-mono': "'Roboto Mono', monospace",
        radius: '1.25rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      },
      dark: {
        background: 'oklch(0.17 0.02 283.80)',
        foreground: 'oklch(0.92 0.03 285.88)',
        card: 'oklch(0.23 0.04 282.93)',
        'card-foreground': 'oklch(0.92 0.03 285.88)',
        primary: 'oklch(0.72 0.16 290.40)',
        'primary-foreground': 'oklch(0.17 0.02 283.80)',
        secondary: 'oklch(0.31 0.07 283.46)',
        'secondary-foreground': 'oklch(0.84 0.08 285.91)',
        muted: 'oklch(0.27 0.06 281.44)',
        'muted-foreground': 'oklch(0.72 0.05 285.17)',
        accent: 'oklch(0.34 0.08 280.97)',
        'accent-foreground': 'oklch(0.92 0.03 285.88)',
        destructive: 'oklch(0.69 0.21 14.99)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0.33 0.06 282.58)',
        input: 'oklch(0.33 0.06 282.58)',
        ring: 'oklch(0.72 0.16 290.40)',
        'chart-1': 'oklch(0.72 0.16 290.40)',
        'chart-2': 'oklch(0.34 0.08 280.97)',
        'chart-3': 'oklch(0.50 0.15 183.21)',
        'chart-4': 'oklch(0.45 0.13 224.37)',
        'chart-5': 'oklch(0.69 0.21 14.99)',
        sidebar: 'oklch(0.17 0.02 283.80)',
        'sidebar-foreground': 'oklch(0.92 0.03 285.88)',
        'sidebar-primary': 'oklch(0.72 0.16 290.40)',
        'sidebar-primary-foreground': 'oklch(0.17 0.02 283.80)',
        'sidebar-accent': 'oklch(0.34 0.08 280.97)',
        'sidebar-accent-foreground': 'oklch(0.92 0.03 285.88)',
        'sidebar-border': 'oklch(0.33 0.06 282.58)',
        'sidebar-ring': 'oklch(0.72 0.16 290.40)',
        'font-sans': "'Plus Jakarta Sans', sans-serif",
        'font-serif': "'Lora', serif",
        'font-mono': "'Roboto Mono', monospace",
        radius: '1.25rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      }
    }
  },
  {
    name: 'Nature',
    font: {
      sans: "'Montserrat', sans-serif",
      heading: "'Merriweather', serif",
      mono: "'Source Code Pro', monospace",
    },
    colors: {
      light: {
        background: 'oklch(0.97 0.01 80.72)',
        foreground: 'oklch(0.30 0.04 30.20)',
        card: 'oklch(0.97 0.01 80.72)',
        'card-foreground': 'oklch(0.30 0.04 30.20)',
        primary: 'oklch(0.52 0.13 144.17)',
        'primary-foreground': 'oklch(1.00 0 0)',
        secondary: 'oklch(0.96 0.02 147.64)',
        'secondary-foreground': 'oklch(0.43 0.12 144.31)',
        muted: 'oklch(0.94 0.01 74.42)',
        'muted-foreground': 'oklch(0.45 0.05 39.21)',
        accent: 'oklch(0.90 0.05 146.04)',
        'accent-foreground': 'oklch(0.43 0.12 144.31)',
        destructive: 'oklch(0.54 0.19 26.72)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0.88 0.02 74.64)',
        input: 'oklch(0.88 0.02 74.64)',
        ring: 'oklch(0.52 0.13 144.17)',
        'chart-1': 'oklch(0.52 0.13 144.17)',
        'chart-2': 'oklch(0.90 0.05 146.04)',
        'chart-3': 'oklch(0.70 0.13 94.43)',
        'chart-4': 'oklch(0.62 0.11 33.26)',
        'chart-5': 'oklch(0.54 0.19 26.72)',
        sidebar: 'oklch(0.96 0.02 147.64)',
        'sidebar-foreground': 'oklch(0.30 0.04 30.20)',
        'sidebar-primary': 'oklch(0.52 0.13 144.17)',
        'sidebar-primary-foreground': 'oklch(1.00 0 0)',
        'sidebar-accent': 'oklch(0.90 0.05 146.04)',
        'sidebar-accent-foreground': 'oklch(0.43 0.12 144.31)',
        'sidebar-border': 'oklch(0.88 0.02 74.64)',
        'sidebar-ring': 'oklch(0.52 0.13 144.17)',
        'font-sans': "'Montserrat', sans-serif",
        'font-serif': "'Merriweather', serif",
        'font-mono': "'Source Code Pro', monospace",
        radius: '0.5rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      },
      dark: {
        background: 'oklch(0.27 0.03 150.77)',
        foreground: 'oklch(0.94 0.01 72.66)',
        card: 'oklch(0.33 0.03 146.99)',
        'card-foreground': 'oklch(0.94 0.01 72.66)',
        primary: 'oklch(0.67 0.16 144.21)',
        'primary-foreground': 'oklch(0.22 0.05 145.73)',
        secondary: 'oklch(0.39 0.03 142.99)',
        'secondary-foreground': 'oklch(0.90 0.02 142.55)',
        muted: 'oklch(0.33 0.03 146.99)',
        'muted-foreground': 'oklch(0.86 0.02 76.10)',
        accent: 'oklch(0.58 0.14 144.18)',
        'accent-foreground': 'oklch(0.94 0.01 72.66)',
        destructive: 'oklch(0.54 0.19 26.72)',
        'destructive-foreground': 'oklch(0.94 0.01 72.66)',
        border: 'oklch(0.39 0.03 142.99)',
        input: 'oklch(0.39 0.03 142.99)',
        ring: 'oklch(0.67 0.16 144.21)',
        'chart-1': 'oklch(0.67 0.16 144.21)',
        'chart-2': 'oklch(0.58 0.14 144.18)',
        'chart-3': 'oklch(0.57 0.12 92.47)',
        'chart-4': 'oklch(0.49 0.09 48.65)',
        'chart-5': 'oklch(0.54 0.19 26.72)',
        sidebar: 'oklch(0.28 0.05 146.44)',
        'sidebar-foreground': 'oklch(0.94 0.01 72.66)',
        'sidebar-primary': 'oklch(0.67 0.16 144.21)',
        'sidebar-primary-foreground': 'oklch(0.22 0.05 145.73)',
        'sidebar-accent': 'oklch(0.58 0.14 144.18)',
        'sidebar-accent-foreground': 'oklch(0.94 0.01 72.66)',
        'sidebar-border': 'oklch(0.39 0.03 142.99)',
        'sidebar-ring': 'oklch(0.67 0.16 144.21)',
        'font-sans': "'Montserrat', sans-serif",
        'font-serif': "'Merriweather', serif",
        'font-mono': "'Source Code Pro', monospace",
        radius: '0.5rem',
        'shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
        'shadow-sm': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        shadow: '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 1px 2px -1px hsl(0 0% 0% / 0.10)',
        'shadow-md': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 2px 4px -1px hsl(0 0% 0% / 0.10)',
        'shadow-lg': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 4px 6px -1px hsl(0 0% 0% / 0.10)',
        'shadow-xl': '0 1px 3px 0px hsl(0 0% 0% / 0.10), 0 8px 10px -1px hsl(0 0% 0% / 0.10)',
        'shadow-2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
      }
    }
  },
  {
    name: 'Neo Brutalism',
    font: {
      sans: "'DM Sans', sans-serif",
      heading: "'Space Mono', monospace",
      mono: "'Space Mono', monospace",
    },
    colors: {
      light: {
        background: 'oklch(1.00 0 0)',
        foreground: 'oklch(0 0 0)',
        card: 'oklch(1.00 0 0)',
        'card-foreground': 'oklch(0 0 0)',
        primary: 'oklch(0.65 0.24 26.97)',
        'primary-foreground': 'oklch(1.00 0 0)',
        secondary: 'oklch(0.97 0.21 109.77)',
        'secondary-foreground': 'oklch(0 0 0)',
        muted: 'oklch(0.96 0 0)',
        'muted-foreground': 'oklch(0.32 0 0)',
        accent: 'oklch(0.56 0.24 260.82)',
        'accent-foreground': 'oklch(1.00 0 0)',
        destructive: 'oklch(0 0 0)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0 0 0)',
        input: 'oklch(0 0 0)',
        ring: 'oklch(0.65 0.24 26.97)',
        radius: '0rem',
      },
      dark: {
        background: 'oklch(0 0 0)',
        foreground: 'oklch(1.00 0 0)',
        card: 'oklch(0.32 0 0)',
        'card-foreground': 'oklch(1.00 0 0)',
        primary: 'oklch(0.70 0.19 23.19)',
        'primary-foreground': 'oklch(0 0 0)',
        secondary: 'oklch(0.97 0.20 109.62)',
        'secondary-foreground': 'oklch(0 0 0)',
        muted: 'oklch(0.32 0 0)',
        'muted-foreground': 'oklch(0.85 0 0)',
        accent: 'oklch(0.68 0.18 252.26)',
        'accent-foreground': 'oklch(0 0 0)',
        destructive: 'oklch(1.00 0 0)',
        'destructive-foreground': 'oklch(0 0 0)',
        border: 'oklch(1.00 0 0)',
        input: 'oklch(1.00 0 0)',
        ring: 'oklch(0.70 0.19 23.19)',
      }
    }
  },
  {
    name: 'Elegant Luxury',
    font: {
      sans: "'Poppins', sans-serif",
      heading: "'Libre Baskerville', serif",
      mono: "'IBM Plex Mono', monospace",
    },
    colors: {
      light: {
        background: 'oklch(0.98 0.00 56.38)',
        foreground: 'oklch(0.22 0 0)',
        card: 'oklch(0.98 0.00 56.38)',
        'card-foreground': 'oklch(0.22 0 0)',
        primary: 'oklch(0.47 0.15 24.94)',
        'primary-foreground': 'oklch(1.00 0 0)',
        secondary: 'oklch(0.96 0.04 89.09)',
        'secondary-foreground': 'oklch(0.48 0.10 75.12)',
        muted: 'oklch(0.94 0.01 53.44)',
        'muted-foreground': 'oklch(0.44 0.01 73.64)',
        accent: 'oklch(0.96 0.06 95.62)',
        'accent-foreground': 'oklch(0.40 0.13 25.72)',
        destructive: 'oklch(0.44 0.16 26.90)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0.94 0.03 80.99)',
        input: 'oklch(0.94 0.03 80.99)',
        ring: 'oklch(0.47 0.15 24.94)',
        radius: '0.375rem',
      },
      dark: {
        background: 'oklch(0.22 0.01 56.04)',
        foreground: 'oklch(0.97 0.00 106.42)',
        card: 'oklch(0.27 0.01 34.30)',
        'card-foreground': 'oklch(0.97 0.00 106.42)',
        primary: 'oklch(0.51 0.19 27.52)',
        'primary-foreground': 'oklch(0.98 0.00 56.38)',
        secondary: 'oklch(0.47 0.12 46.20)',
        'secondary-foreground': 'oklch(0.96 0.06 95.62)',
        muted: 'oklch(0.27 0.01 34.30)',
        'muted-foreground': 'oklch(0.87 0.00 56.37)',
        accent: 'oklch(0.56 0.15 49.00)',
        'accent-foreground': 'oklch(0.96 0.06 95.62)',
        destructive: 'oklch(0.64 0.21 25.33)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0.37 0.01 67.56)',
        input: 'oklch(0.37 0.01 67.56)',
        ring: 'oklch(0.51 0.19 27.52)',
      }
    }
  },
  {
    name: 'Cyberpunk',
    font: {
      sans: "'Outfit', sans-serif",
      heading: "'Outfit', sans-serif",
      mono: "'Fira Code', monospace",
    },
    colors: {
      light: {
        background: 'oklch(0.98 0.00 247.84)',
        foreground: 'oklch(0.16 0.04 281.83)',
        card: 'oklch(1.00 0 0)',
        'card-foreground': 'oklch(0.16 0.04 281.83)',
        primary: 'oklch(0.67 0.29 341.41)',
        'primary-foreground': 'oklch(1.00 0 0)',
        secondary: 'oklch(0.96 0.02 286.02)',
        'secondary-foreground': 'oklch(0.16 0.04 281.83)',
        muted: 'oklch(0.96 0.02 286.02)',
        'muted-foreground': 'oklch(0.16 0.04 281.83)',
        accent: 'oklch(0.89 0.17 171.27)',
        'accent-foreground': 'oklch(0.16 0.04 281.83)',
        destructive: 'oklch(0.65 0.23 34.04)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0.92 0.01 225.09)',
        input: 'oklch(0.92 0.01 225.09)',
        ring: 'oklch(0.67 0.29 341.41)',
        radius: '0.5rem',
      },
      dark: {
        background: 'oklch(0.16 0.04 281.83)',
        foreground: 'oklch(0.95 0.01 260.73)',
        card: 'oklch(0.25 0.06 281.14)',
        'card-foreground': 'oklch(0.95 0.01 260.73)',
        primary: 'oklch(0.67 0.29 341.41)',
        'primary-foreground': 'oklch(1.00 0 0)',
        secondary: 'oklch(0.25 0.06 281.14)',
        'secondary-foreground': 'oklch(0.95 0.01 260.73)',
        muted: 'oklch(0.25 0.06 281.14)',
        'muted-foreground': 'oklch(0.62 0.05 278.10)',
        accent: 'oklch(0.89 0.17 171.27)',
        'accent-foreground': 'oklch(0.16 0.04 281.83)',
        destructive: 'oklch(0.65 0.23 34.04)',
        'destructive-foreground': 'oklch(1.00 0 0)',
        border: 'oklch(0.33 0.08 280.79)',
        input: 'oklch(0.33 0.08 280.79)',
        ring: 'oklch(0.67 0.29 341.41)',
      }
    }
  }
];

// CSS-in-JS styles
const styles = {
  container: `
    flex
    items-center
    gap-2
  `,
  button: `
    w-10
    h-10
    flex
    items-center
    justify-center
    rounded-full
    bg-card
    shadow-lg
    hover:shadow-xl
    transition-all
    duration-200
    border
    border-border
    cursor-pointer
  `,
  icon: `
    w-5
    h-5
    text-primary
    transition-transform
    duration-200
  `,
  dropdown: `
    absolute
    top-full
    right-0
    mt-2
    w-64
    bg-card/100
    backdrop-blur-lg
    rounded-lg
    shadow-xl
    border
    border-border
    p-3
    space-y-2
    z-50
    dark:bg-card/100
  `,
  themeButton: `
    w-full
    flex
    items-center
    gap-3
    px-3
    py-2.5
    rounded-md
    hover:bg-accent
    transition-colors
    duration-200
    text-left
  `,
  colorPreview: `
    flex
    gap-1.5
    items-center
  `,
  colorDot: `
    w-3
    h-3
    rounded-full
    ring-1
    ring-black/5
    dark:ring-white/5
  `
};

// Theme configuration
const THEME_CONFIG = {
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f9fafb',
    '--text-primary': '#111827',
    '--text-secondary': '#374151',
    '--accent-primary': '#3b82f6',
    '--accent-secondary': '#60a5fa',
    '--border-color': '#e5e7eb',
    '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  dark: {
    '--bg-primary': '#111827',
    '--bg-secondary': '#1f2937',
    '--text-primary': '#f9fafb',
    '--text-secondary': '#e5e7eb',
    '--accent-primary': '#60a5fa',
    '--accent-secondary': '#93c5fd',
    '--border-color': '#374151',
    '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
  }
};

// CSS to inject
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Sora:wght@400;600&family=Fira+Code&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=IBM+Plex+Mono&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,700,500&f[]=clash-display@400,600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Cal+Sans:wght@400;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Source+Serif+Pro:wght@400;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Lora:wght@400;500;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Source+Code+Pro&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono&family=Roboto:wght@400;500;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Playfair+Display:wght@400;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Supreme:wght@400;500;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap');

  :root {
    color-scheme: light dark;
  }

  .dark {
    color-scheme: dark;
  }

  body {
    font-family: var(--font-sans);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
  }

  code, pre {
    font-family: var(--font-mono);
  }

  /* Transition all color changes */
  *, *::before, *::after {
    transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out;
  }
`;

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(COLOR_THEMES[0]);

  useEffect(() => {
    // Inject global styles
    const styleElement = document.createElement('style');
    styleElement.textContent = GLOBAL_STYLES;
    document.head.appendChild(styleElement);

    // Initialize theme from local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const savedColorTheme = localStorage.getItem('colorTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    if (savedColorTheme) {
      const theme = COLOR_THEMES.find(t => t.name === savedColorTheme);
      if (theme) setCurrentTheme(theme);
    }
    updateTheme(shouldBeDark, savedColorTheme ? COLOR_THEMES.find(t => t.name === savedColorTheme) : COLOR_THEMES[0]);

    // Cleanup
    return () => {
      styleElement.remove();
    };
  }, []);

  const updateTheme = (dark: boolean, colorTheme = currentTheme) => {
    const root = document.documentElement;
    const colors = colorTheme.colors[dark ? 'dark' : 'light'];

    console.log(`Applying theme: ${colorTheme.name}, dark mode: ${dark}`);

    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    // First, clear all previous theme variables to prevent artifacts
    // from previously set themes
    root.style.cssText = '';

    // Apply all theme variables - handle OKLCH format specially
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Set the raw value directly
        root.style.setProperty(`--${key}`, value);

        // For OKLCH format
        if (value.startsWith('oklch')) {
          // Extract the parameters from inside oklch()
          const match = value.match(/oklch\((.*)\)/);
          if (match && match[1]) {
            // Set the parameters for use in CSS custom properties
            // HSL colors are set as the parameters only, but OKLCH needs the full value
            root.style.setProperty(`--${key}-raw`, value);
          }
        }
        // For HSL format, extract components for tailwind compatibility
        else if (value.startsWith('hsl')) {
          const hslMatch = value.match(/hsl\(([\d.\s,%]+)\)/);
          if (hslMatch) {
            root.style.setProperty(`--${key}`, hslMatch[1]);
          }
        }
      }
    });

    // Apply basic fonts
    root.style.setProperty('--font-sans', colorTheme.font.sans);
    root.style.setProperty('--font-heading', colorTheme.font.heading);
    root.style.setProperty('--font-mono', colorTheme.font.mono);

    // Force a repaint to ensure all styles apply correctly
    document.body.style.display = 'none';
    setTimeout(() => {
      document.body.style.display = '';
    }, 5);

    localStorage.setItem('colorTheme', colorTheme.name);
  };

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    updateTheme(newDark);
  };

  const selectTheme = (theme: typeof COLOR_THEMES[0]) => {
    setCurrentTheme(theme);
    updateTheme(isDark, theme);
    setIsOpen(false);
  };

  return (
    <div className={styles.container}>
      <button
        onClick={toggleTheme}
        className={styles.button}
        title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        {isDark ? (
          <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={styles.button}
          title="Select color theme"
          aria-label="Select color theme"
        >
          <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
        </button>

        {isOpen && (
          <div className={`${styles.dropdown} theme-dropdown`}>
            <div className="text-sm font-medium text-muted-foreground mb-2">Select Theme</div>
            {COLOR_THEMES.map((theme) => (
              <button
                key={theme.name}
                onClick={() => selectTheme(theme)}
                className={`${styles.themeButton} ${currentTheme.name === theme.name ? 'bg-accent' : ''}`}
                style={{ fontFamily: theme.font.sans }}
              >
                <div className={styles.colorPreview}>
                  <div 
                    className={styles.colorDot}
                    style={{ backgroundColor: theme.colors.light.primary }}
                  />
                  <div 
                    className={styles.colorDot}
                    style={{ backgroundColor: theme.colors.light.secondary }}
                  />
                  <div 
                    className={styles.colorDot}
                    style={{ backgroundColor: theme.colors.light.accent }}
                  />
                  <div 
                    className={styles.colorDot}
                    style={{ backgroundColor: theme.colors.light['background-secondary'] }}
                  />
                  <div 
                    className={styles.colorDot}
                    style={{ backgroundColor: theme.colors.light.foreground }}
                  />
                </div>
                <span className="text-sm text-card-foreground">{theme.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeToggle;
