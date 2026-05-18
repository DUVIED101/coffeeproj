// Platform fee percentage (15%)
export const PLATFORM_FEE_RATE = 0.15;

// Default search radius in meters (50km)
export const DEFAULT_SEARCH_RADIUS_METERS = 50000;

// Pagination limit
export const DEFAULT_PAGE_LIMIT = 20;

// Currency
export const DEFAULT_CURRENCY = 'RUB';

// Equipment types
export const EQUIPMENT_TYPES = [
  'La Marzocco',
  'Victoria Arduino',
  'Nuova Simonelli',
  'Synesso',
  'Slayer',
  'Dalla Corte',
  'Sanremo',
  'Rocket Espresso',
] as const;

// Colors
export const COLORS = {
  primary: '#8B4513', // Coffee brown
  secondary: '#D2691E', // Chocolate
  accent: '#FF6B35', // Bright orange
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  text: '#2C3E50',
  textSecondary: '#7F8C8D',
  border: '#E0E0E0',
  success: '#27AE60',
  error: '#E74C3C',
  warning: '#F39C12',
};

// Fonts
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  semiBold: 'System',
};

// Corner radii (iOS HIG aligned)
export const RADII = {
  pill: 999, // capsule chips, filter pills, header action buttons
  card: 12, // cards, primary buttons, list rows, sections
  input: 10, // text inputs, date buttons, segmented controls
  chipSmall: 8, // tiny status badges inside cards
};
