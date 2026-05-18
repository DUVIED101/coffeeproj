declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  export const NODE_ENV: string;
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import type { ComponentType } from 'react';
  import type { TextProps } from 'react-native';
  const Icon: ComponentType<TextProps & { name: string; size?: number; color?: string }>;
  export default Icon;
}
