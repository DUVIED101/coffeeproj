// Platform fee percentage (15%)
export const PLATFORM_FEE_RATE = 0.15;

// Whether to surface the platform commission to cafes in the UI. Hidden during
// the free beta (Terms/landing say cafes pay nothing yet); the fee is still
// computed and stored, so flip this to re-enable the breakdown at launch.
export const SHOW_PLATFORM_FEE = false;

// Default search radius in meters (50km)
export const DEFAULT_SEARCH_RADIUS_METERS = 50000;

// Pagination limit
export const DEFAULT_PAGE_LIMIT = 20;

// Currency
export const DEFAULT_CURRENCY = 'RUB';

// Coffee-shop equipment. Categories let editor UIs render a shorter, scannable
// list instead of one 30-item wall of chips. Both the flat union (Equipment in
// types/business.ts) and the grouped list reference the same brand literals,
// so they cannot drift.
export const EQUIPMENT_TYPES = [
  // Espresso machines
  'La Marzocco',
  'Victoria Arduino',
  'Nuova Simonelli',
  'La Cimbali',
  'Faema',
  'Synesso',
  'Slayer',
  'Dalla Corte',
  'Sanremo',
  'Rocket Espresso',
  'Astoria',
  'Wega',
  'Carimali',
  'Bezzera',
  'ECM',
  'Profitec',
  'Lelit',
  'Kees van der Westen',
  'Eversys',
  'WMF',
  'Schaerer',
  // Grinders
  'Mahlkönig',
  'Mazzer',
  'Anfim',
  'Eureka',
  'Compak',
  'Ditting',
  'Fiorenzato',
  'Macap',
] as const;

export type EquipmentCategoryKey = 'espresso' | 'grinder';

export const EQUIPMENT_CATEGORIES: ReadonlyArray<{
  key: EquipmentCategoryKey;
  brands: ReadonlyArray<(typeof EQUIPMENT_TYPES)[number]>;
}> = [
  {
    key: 'espresso',
    brands: [
      'La Marzocco',
      'Victoria Arduino',
      'Nuova Simonelli',
      'La Cimbali',
      'Faema',
      'Synesso',
      'Slayer',
      'Dalla Corte',
      'Sanremo',
      'Rocket Espresso',
      'Astoria',
      'Wega',
      'Carimali',
      'Bezzera',
      'ECM',
      'Profitec',
      'Lelit',
      'Kees van der Westen',
      'Eversys',
      'WMF',
      'Schaerer',
    ],
  },
  {
    key: 'grinder',
    brands: ['Mahlkönig', 'Mazzer', 'Anfim', 'Eureka', 'Compak', 'Ditting', 'Fiorenzato', 'Macap'],
  },
];

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
