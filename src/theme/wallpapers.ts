export interface WallpaperPreset {
  id: string;
  name: string;
  type: 'gradient' | 'cosmic' | 'abstract' | 'minimal';
  style: string;
  accentSeed: string;
  isDark: boolean;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'cosmic-nebula',
    name: 'Cosmic Nebula',
    type: 'cosmic',
    style: 'radial-gradient(circle at 20% 20%, #2e1065 0%, #0f172a 40%, #020617 80%)',
    accentSeed: '#7c3aed',
    isDark: true,
  },
  {
    id: 'deep-ocean',
    name: 'Abyssal Blue',
    type: 'abstract',
    style: 'linear-gradient(135deg, #022c43 0%, #053f5c 35%, #115173 70%, #02182b 100%)',
    accentSeed: '#0ea5e9',
    isDark: true,
  },
  {
    id: 'emerald-aurora',
    name: 'Emerald Aurora',
    type: 'abstract',
    style: 'radial-gradient(circle at 80% 20%, #064e3b 0%, #022c22 45%, #051c14 90%)',
    accentSeed: '#10b981',
    isDark: true,
  },
  {
    id: 'sunset-terracotta',
    name: 'Sunset Terracotta',
    type: 'gradient',
    style: 'linear-gradient(135deg, #431407 0%, #7c2d12 40%, #9a3412 70%, #1c0a00 100%)',
    accentSeed: '#f97316',
    isDark: true,
  },
  {
    id: 'midnight-monochrome',
    name: 'Midnight Slate',
    type: 'minimal',
    style: 'linear-gradient(145deg, #090a0f 0%, #12151e 50%, #06070a 100%)',
    accentSeed: '#94a3b8',
    isDark: true,
  },
  {
    id: 'sakura-blossom',
    name: 'Sakura Glow',
    type: 'abstract',
    style: 'linear-gradient(135deg, #500724 0%, #831843 45%, #9d174d 75%, #1a020d 100%)',
    accentSeed: '#ec4899',
    isDark: true,
  },
];
