import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  Scheme,
  CorePalette
} from '@material/material-color-utilities';

export interface M3ColorScheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  shadow: string;
  scrim: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
}

export interface GeneratedM3Theme {
  sourceColorHex: string;
  light: M3ColorScheme;
  dark: M3ColorScheme;
}

// Convert scheme to M3ColorScheme object
function schemeToColors(scheme: any): M3ColorScheme {
  return {
    primary: hexFromArgb(scheme.primary),
    onPrimary: hexFromArgb(scheme.onPrimary),
    primaryContainer: hexFromArgb(scheme.primaryContainer),
    onPrimaryContainer: hexFromArgb(scheme.onPrimaryContainer),
    secondary: hexFromArgb(scheme.secondary),
    onSecondary: hexFromArgb(scheme.onSecondary),
    secondaryContainer: hexFromArgb(scheme.secondaryContainer),
    onSecondaryContainer: hexFromArgb(scheme.onSecondaryContainer),
    tertiary: hexFromArgb(scheme.tertiary),
    onTertiary: hexFromArgb(scheme.onTertiary),
    tertiaryContainer: hexFromArgb(scheme.tertiaryContainer),
    onTertiaryContainer: hexFromArgb(scheme.onTertiaryContainer),
    error: hexFromArgb(scheme.error),
    onError: hexFromArgb(scheme.onError),
    errorContainer: hexFromArgb(scheme.errorContainer),
    onErrorContainer: hexFromArgb(scheme.onErrorContainer),
    background: hexFromArgb(scheme.background),
    onBackground: hexFromArgb(scheme.onBackground),
    surface: hexFromArgb(scheme.surface),
    onSurface: hexFromArgb(scheme.onSurface),
    surfaceVariant: hexFromArgb(scheme.surfaceVariant),
    onSurfaceVariant: hexFromArgb(scheme.onSurfaceVariant),
    outline: hexFromArgb(scheme.outline),
    outlineVariant: hexFromArgb(scheme.outlineVariant),
    shadow: hexFromArgb(scheme.shadow),
    scrim: hexFromArgb(scheme.scrim),
    inverseSurface: hexFromArgb(scheme.inverseSurface),
    inverseOnSurface: hexFromArgb(scheme.inverseOnSurface),
    inversePrimary: hexFromArgb(scheme.inversePrimary),
    // Material 3 elevation surfaces fallback / calculations
    surfaceContainer: hexFromArgb(scheme.surface),
    surfaceContainerHigh: hexFromArgb(scheme.surfaceVariant),
    surfaceContainerHighest: hexFromArgb(scheme.outlineVariant),
  };
}

export function generateM3ThemeFromHex(sourceHex: string): GeneratedM3Theme {
  const argb = argbFromHex(sourceHex);
  const theme = themeFromSourceColor(argb);

  return {
    sourceColorHex: sourceHex,
    light: schemeToColors(theme.schemes.light),
    dark: schemeToColors(theme.schemes.dark),
  };
}

/**
 * Apply M3 color tokens to document root CSS variables
 */
export function applyThemeTokens(scheme: M3ColorScheme, isDark: boolean) {
  const root = document.documentElement;
  
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Set all official @material/web tokens
  root.style.setProperty('--md-sys-color-primary', scheme.primary);
  root.style.setProperty('--md-sys-color-on-primary', scheme.onPrimary);
  root.style.setProperty('--md-sys-color-primary-container', scheme.primaryContainer);
  root.style.setProperty('--md-sys-color-on-primary-container', scheme.onPrimaryContainer);

  root.style.setProperty('--md-sys-color-secondary', scheme.secondary);
  root.style.setProperty('--md-sys-color-on-secondary', scheme.onSecondary);
  root.style.setProperty('--md-sys-color-secondary-container', scheme.secondaryContainer);
  root.style.setProperty('--md-sys-color-on-secondary-container', scheme.onSecondaryContainer);

  root.style.setProperty('--md-sys-color-tertiary', scheme.tertiary);
  root.style.setProperty('--md-sys-color-on-tertiary', scheme.onTertiary);
  root.style.setProperty('--md-sys-color-tertiary-container', scheme.tertiaryContainer);
  root.style.setProperty('--md-sys-color-on-tertiary-container', scheme.onTertiaryContainer);

  root.style.setProperty('--md-sys-color-error', scheme.error);
  root.style.setProperty('--md-sys-color-on-error', scheme.onError);
  root.style.setProperty('--md-sys-color-error-container', scheme.errorContainer);
  root.style.setProperty('--md-sys-color-on-error-container', scheme.onErrorContainer);

  root.style.setProperty('--md-sys-color-background', scheme.background);
  root.style.setProperty('--md-sys-color-on-background', scheme.onBackground);

  root.style.setProperty('--md-sys-color-surface', scheme.surface);
  root.style.setProperty('--md-sys-color-on-surface', scheme.onSurface);
  root.style.setProperty('--md-sys-color-surface-variant', scheme.surfaceVariant);
  root.style.setProperty('--md-sys-color-on-surface-variant', scheme.onSurfaceVariant);

  root.style.setProperty('--md-sys-color-outline', scheme.outline);
  root.style.setProperty('--md-sys-color-outline-variant', scheme.outlineVariant);
  root.style.setProperty('--md-sys-color-shadow', scheme.shadow);
  root.style.setProperty('--md-sys-color-scrim', scheme.scrim);
  root.style.setProperty('--md-sys-color-inverse-surface', scheme.inverseSurface);
  root.style.setProperty('--md-sys-color-inverse-on-surface', scheme.inverseOnSurface);
  root.style.setProperty('--md-sys-color-inverse-primary', scheme.inversePrimary);

  // Surface containers
  root.style.setProperty('--md-sys-color-surface-container', scheme.surfaceContainer);
  root.style.setProperty('--md-sys-color-surface-container-high', scheme.surfaceContainerHigh);
  root.style.setProperty('--md-sys-color-surface-container-highest', scheme.surfaceContainerHighest);
}

/**
 * Extract dominant colors from an image element or canvas
 */
export async function extractColorFromImage(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('#6750A4'); // M3 default purple
          return;
        }
        ctx.drawImage(img, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          // sample every 4th pixel
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        
        // Convert to hex
        const toHex = (c: number) => c.toString(16).padStart(2, '0');
        resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
      } catch (e) {
        resolve('#6750A4');
      }
    };
    img.onerror = () => {
      resolve('#6750A4');
    };
  });
}
