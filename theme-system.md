# Theme System Documentation

## Overview
Complete theme system with OKLCH color space support, multiple predefined themes, and real-time switching capabilities. Features direct OKLCH color application, enhanced UI components, and extensive font support.

## Theme Structure

```typescript
interface ThemeDefinition {
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
}

interface ThemeVariableSet {
  // Core colors
  background: string;
  foreground: string;
  'background-secondary': string;
  'foreground-secondary': string;
  
  // UI containers
  card: string;
  'card-foreground': string;
  popover: string;
  'popover-foreground': string;
  
  // UI elements
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  
  // System colors
  destructive: string;
  'destructive-foreground': string;
  border: string;
  input: string;
  ring: string;
  
  // Data visualization
  'chart-1': string;
  'chart-2': string;
  'chart-3': string;
  'chart-4': string;
  'chart-5': string;
  
  // Sidebar/Navigation
  sidebar: string;
  'sidebar-foreground': string;
  'sidebar-primary': string;
  'sidebar-primary-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-border': string;
  'sidebar-ring': string;
  
  // Typography
  'font-sans': string;
  'font-serif': string;
  'font-mono': string;
  
  // Layout
  radius: string;
  
  // Shadows
  'shadow-2xs': string;
  'shadow-xs': string;
  'shadow-sm': string;
  shadow: string;
  'shadow-md': string;
  'shadow-lg': string;
  'shadow-xl': string;
  'shadow-2xl': string;
}
```

## Available Themes

The system includes 19 professionally designed themes:

1. **Default**
   - Clean, modern interface
   - OKLCH color space
   - System fonts and blue accent
   ```typescript
   default: {
     name: 'Default',
     font: {
       sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
       heading: "'Cal Sans', 'Inter', sans-serif",
       mono: "'JetBrains Mono', monospace",
     },
     colors: {
       light: {
         background: 'hsl(0 0% 100%)',
         foreground: 'hsl(222.2 84% 4.9%)',
         primary: 'hsl(221.2 83.2% 53.3%)',
         // ... additional colors
       },
       dark: {
         background: 'hsl(222.2 84% 4.9%)',
         foreground: 'hsl(210 40% 98%)',
         // ... additional colors
       }
     }
   }
   ```

2. **Claude**
   - AI-inspired aesthetics
   - Neutral base with orange accent
   - System font stack
   ```typescript
   claude: {
     name: 'Claude',
     font: {
       sans: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
       heading: "var(--font-sans)",
       mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
     },
     colors: {
       light: {
         background: 'oklch(0.98 0.01 95.10)',
         foreground: 'oklch(0.34 0.03 95.72)',
         primary: 'oklch(0.62 0.14 39.04)',
         // ... additional colors
       },
       dark: {
         // ... dark mode colors
       }
     }
   }
   ```

3. **Forest, Sunset, Rose, Zinc, Nord, Slate**
   - Nature and environment-inspired themes
   - Professional color palettes

4. **Ocean, Vintage, Neon, Cyberpunk**
   - Specialized aesthetic themes
   - Vibrant colors and consistent styling

5. **Specialty Themes**
   - Kodama Grove: Nature-inspired organic theme
   - Vintage Paper: Classic paper aesthetics
   - Claymorphism: Soft, clay-like UI elements
   - Nature: Earth-toned natural palette
   - Neo Brutalism: Stark, bold design language
   - Elegant Luxury: Refined, sophisticated look
   - Base: System theme variant

## Color System

The theme system utilizes both HSL and OKLCH color formats:

```typescript
// HSL format (traditional)
'background': 'hsl(0 0% 100%)'

// OKLCH format (modern perceptual)
'background': 'oklch(0.98 0.01 95.10)'
```

Benefits of OKLCH:
- Perceptually uniform color space
- Better contrast management
- More intuitive color manipulation
- Consistent brightness across hues
- Better color accessibility

## Theme Management

```typescript
// Apply theme with enhanced OKLCH support
function updateTheme(dark: boolean, colorTheme = currentTheme) {
  const root = document.documentElement;
  const colors = colorTheme.colors[dark ? 'dark' : 'light'];

  // Clear previous theme
  root.style.cssText = '';

  // Apply all theme variables with OKLCH support
  Object.entries(colors).forEach(([key, value]) => {
    if (typeof value === 'string') {
      // Set the raw value directly
      root.style.setProperty(`--${key}`, value);

      // For OKLCH format
      if (value.startsWith('oklch')) {
        // Also set raw value for direct application
        root.style.setProperty(`--${key}-raw`, value);
      }
      // For HSL format
      else if (value.startsWith('hsl')) {
        const hslMatch = value.match(/hsl\(([\d.\s,%]+)\)/);
        if (hslMatch) {
          root.style.setProperty(`--${key}`, hslMatch[1]);
        }
      }
    }
  });

  // Apply fonts
  root.style.setProperty('--font-sans', colorTheme.font.sans);
  root.style.setProperty('--font-heading', colorTheme.font.heading);
  root.style.setProperty('--font-mono', colorTheme.font.mono);
}
```

## Enhanced Features

### Improved Theme Dropdown
The theme selector dropdown now features:
- Opaque background for better visibility
- Enhanced styling with proper shadows
- Color previews for each theme
- Font preview using the theme's sans font
- Persistent theme selection

### Direct Color Application
Colors can be applied in two ways:
```css
/* Traditional HSL approach */
background-color: hsl(var(--background));

/* Direct OKLCH value (when available) */
background-color: var(--background-raw);
```

### Font Loading
All theme fonts are dynamically loaded:
```typescript
// CSS to inject
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Sora:wght@400;600&family=Fira+Code&display=swap');
  // ... additional font imports

  /* Base styling */
  :root {
    color-scheme: light dark;
  }

  /* Typography */
  body { font-family: var(--font-sans); }
  h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); }
  code, pre { font-family: var(--font-mono); }

  /* Transition all color changes */
  *, *::before, *::after {
    transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out;
  }
`;
```

## Usage Example

```tsx
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  return (
    <div>
      <header className="flex justify-between items-center p-4">
        <h1>My Application</h1>
        <ThemeToggle /> {/* Theme toggle in the header */}
      </header>
      <main>
        {/* Your app content */}
      </main>
    </div>
  );
}
```

## Implementation Details

1. **Color Management**
   - OKLCH color space for better perception
   - HSL fallback for compatibility
   - Direct color variable application
   - Raw color variables for complex scenarios

2. **Typography System**
   - Comprehensive font family support
   - Dynamic font imports
   - Consistent heading and body text
   - Specialized mono fonts for code

3. **Component Integration**
   - Tailwind CSS variables and configuration
   - Custom CSS properties
   - Framework-agnostic design
   - Enhanced UI elements

4. **UI Improvements**
   - Opaque dropdown menu
   - Enhanced shadows and styling
   - Smooth color transitions
   - Proper theme application

## Next Steps

1. Theme Builder Interface
2. Custom Theme Creation
3. Theme Export/Import
4. Animation Options
5. Accessibility Enhancements
6. Performance Optimizations 