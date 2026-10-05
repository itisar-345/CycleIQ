import { Platform, type ViewStyle } from 'react-native';

/** Accent colour for a tracking mode, falling back to the theme tint. */
export const getModeColor = (theme: { tint: string } & Partial<Record<string, string>>, mode: string): string =>
  (["pcos", "pcod", "endo", "peri", "standard"].includes(mode) ? theme[mode] : undefined) ?? theme.tint;

/**
 * Colour tokens. Every text/background pairing used by the app meets WCAG AA (4.5:1):
 * - `tint` works as text on background/surface AND as a fill under `onTint` text.
 * - Condition accents (pcos, endo, …) and `error` work as text and as fills under `onAccent`.
 * - `brand` is the signature peach — decorative only (glows, soft fills), never under text.
 */
export const Colors = {
  light: {
    text: '#3B2F2C',
    textSecondary: '#6E5E58',
    background: '#FFF8F5',
    surface: '#FFFFFF',
    surfaceAlt: '#FFF1EC',
    tint: '#B5462F',
    onTint: '#FFFFFF',
    tintSoft: '#FFE6DD',
    onTintSoft: '#9C3B26',
    brand: '#FFB8A1',
    onAccent: '#FFFFFF',
    icon: '#6E5E58',
    tabIconDefault: '#8F7F7A',
    tabIconSelected: '#B5462F',
    border: '#F2DED7',
    error: '#B83A30',
    success: '#2E7A4C',
    pcos: '#3E7D4B',
    pcod: '#1E7385',
    endo: '#8B4C9E',
    peri: '#9A5B12',
    standard: '#B5462F',
  },
  dark: {
    text: '#FFF4F0',
    textSecondary: '#CDBDB8',
    background: '#1F1A19',
    surface: '#2C2523',
    surfaceAlt: '#352C2A',
    tint: '#FF9E85',
    onTint: '#2A1712',
    tintSoft: '#4A2F28',
    onTintSoft: '#FFD9CE',
    brand: '#FFB8A1',
    onAccent: '#2A1712',
    icon: '#CDBDB8',
    tabIconDefault: '#9E8F8A',
    tabIconSelected: '#FF9E85',
    border: '#463A37',
    error: '#F08A76',
    success: '#81B29A',
    pcos: '#E9C46A',
    pcod: '#4DD0E1',
    endo: '#F4A261',
    peri: '#A8DADC',
    standard: '#FF9E85',
  },
};

export type ThemeColors = (typeof Colors)['light'];

/** 4-pt spacing scale. */
export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const Radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

/** Soft, warm card elevation (Android uses `elevation`). */
export const Shadow: ViewStyle = {
  shadowColor: '#3B2F2C',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});
