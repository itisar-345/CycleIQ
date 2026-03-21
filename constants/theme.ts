import { Platform } from 'react-native';

const tintColorLight = '#FFB8A1'; // Calming Peach primary
const tintColorDark = '#FFD7CD';

export const Colors = {
  light: {
    text: '#4A3D39', // Soft warm brown
    textSecondary: '#8F7F7A',
    background: '#FFF8F6', // Off-white peach
    surface: '#FFFFFF',
    tint: tintColorLight,
    icon: '#8F7F7A',
    tabIconDefault: '#8F7F7A',
    tabIconSelected: tintColorLight,
    border: '#F2DED7',
    error: '#E57373',
    success: '#81C784',
    pcos: '#A5D6A7', // Soft Green
    endo: '#CE93D8', // Soft Purple
    peri: '#FFCC80', // Soft Orange
  },
  dark: {
    text: '#FFF8F6',
    textSecondary: '#D7C7C3',
    background: '#2A2422', // Deep warm dark
    surface: '#3A3230',
    tint: tintColorDark,
    icon: '#D7C7C3',
    tabIconDefault: '#D7C7C3',
    tabIconSelected: tintColorDark,
    border: '#4A3D39',
    error: '#E07A5F',
    success: '#81B29A',
    pcos: '#E9C46A',
    endo: '#F4A261',
    peri: '#A8DADC',
    standard: '#E9E4D4',
  },
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
