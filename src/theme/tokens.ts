// Tokens PROVISIONALES: la identidad real llega en la Fase 0.5. Solo este archivo cambia.
export const lightColors = {
  background: '#FFFFFF',
  surface: '#F3F4F6',
  text: '#111827',
  textMuted: '#6B7280',
  primary: '#4F46E5',
  onPrimary: '#FFFFFF',
  border: '#E5E7EB',
  success: '#16A34A',
  danger: '#DC2626',
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  background: '#0B0F14',
  surface: '#161C24',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  primary: '#818CF8',
  onPrimary: '#0B0F14',
  border: '#27303B',
  success: '#4ADE80',
  danger: '#F87171',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 6, md: 12, lg: 20 };
export const typography = { caption: 13, body: 16, title: 24 };
