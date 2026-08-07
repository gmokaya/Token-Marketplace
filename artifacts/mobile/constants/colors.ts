/**
 * Semantic design tokens synced from the TokenHarvest web platform.
 * Warm espresso palette — matches the coffee/grain marketplace brand.
 */

const colors = {
  light: {
    text: '#371b06',
    tint: '#291409',
    background: '#f8f6f2',
    foreground: '#371b06',
    card: '#ffffff',
    cardForeground: '#371b06',
    primary: '#291409',
    primaryForeground: '#f8f6f2',
    secondary: '#ede5d8',
    secondaryForeground: '#1a0c04',
    muted: '#eeeae5',
    mutedForeground: '#756157',
    accent: '#3c1c0c',
    accentForeground: '#f8f6f2',
    destructive: '#cc1a1a',
    destructiveForeground: '#ffffff',
    border: '#e0d8d1',
    input: '#e0d8d1',
    success: '#2d7d46',
    successForeground: '#ffffff',
  },
  dark: {
    text: '#f8f6f2',
    tint: '#c89060',
    background: '#130b06',
    foreground: '#f8f6f2',
    card: '#1e1109',
    cardForeground: '#f8f6f2',
    primary: '#c89060',
    primaryForeground: '#130b06',
    secondary: '#2a1710',
    secondaryForeground: '#f8f6f2',
    muted: '#241309',
    mutedForeground: '#9a8070',
    accent: '#3d2515',
    accentForeground: '#f8f6f2',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
    border: '#2e1a10',
    input: '#2e1a10',
    success: '#4ade80',
    successForeground: '#052e16',
  },

  // Border radius (px). Sharp-edged brand from web, softened slightly for touch targets.
  radius: 6,
};

export default colors;
export type ColorScheme = typeof colors.light;
