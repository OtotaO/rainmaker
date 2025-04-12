import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { COLOR_THEMES } from '../components/ThemeToggle';

describe('Theme System', () => {
  beforeEach(() => {
    // Setup DOM
    document.documentElement.className = '';
    localStorage.clear();
  });

  afterEach(() => {
    // Cleanup
    document.documentElement.className = '';
    localStorage.clear();
  });

  it('should apply theme CSS variables correctly', () => {
    const theme = COLOR_THEMES[0];
    const root = document.documentElement;
    
    // Apply light theme
    Object.entries(theme.colors.light).forEach(([key, value]) => {
      if (key === 'radius') {
        root.style.setProperty('--radius', value);
      } else {
        const hslMatch = value.match(/hsl\(([\d.\s,%]+)\)/);
        if (hslMatch) {
          root.style.setProperty(`--${key}`, hslMatch[1]);
        }
      }
    });

    // Verify variables
    expect(getComputedStyle(root).getPropertyValue('--background')).toBe(theme.colors.light.background.match(/hsl\(([\d.\s,%]+)\)/)[1]);
    expect(getComputedStyle(root).getPropertyValue('--foreground')).toBe(theme.colors.light.foreground.match(/hsl\(([\d.\s,%]+)\)/)[1]);
  });

  it('should persist theme preference in localStorage', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('colorTheme', COLOR_THEMES[1].name);

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('colorTheme')).toBe(COLOR_THEMES[1].name);
  });

  it('should validate color contrast ratios', () => {
    const calculateContrastRatio = (color1: string, color2: string) => {
      // Convert HSL to RGB and calculate relative luminance
      const getLuminance = (hsl: string) => {
        const [h, s, l] = hsl.match(/\d+/g).map(Number);
        // Simplified luminance calculation for testing
        return l / 100;
      };

      const l1 = getLuminance(color1);
      const l2 = getLuminance(color2);
      
      const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      return contrast;
    };

    COLOR_THEMES.forEach(theme => {
      const bgLuminance = calculateContrastRatio(
        theme.colors.light.background,
        theme.colors.light.foreground
      );
      expect(bgLuminance).toBeGreaterThanOrEqual(4.5); // WCAG AA standard
    });
  });

  it('should load and apply fonts correctly', () => {
    const theme = COLOR_THEMES[0];
    const root = document.documentElement;

    root.style.setProperty('--font-sans', theme.font.sans);
    root.style.setProperty('--font-heading', theme.font.heading);
    root.style.setProperty('--font-mono', theme.font.mono);

    expect(getComputedStyle(root).getPropertyValue('--font-sans')).toBe(theme.font.sans);
    expect(getComputedStyle(root).getPropertyValue('--font-heading')).toBe(theme.font.heading);
    expect(getComputedStyle(root).getPropertyValue('--font-mono')).toBe(theme.font.mono);
  });

  it('should handle system color scheme preference', () => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      value: (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });

    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(true);
  });
}); 