import type { ColorKey } from './types';

/** Apple-ish system palette: [light mode, dark mode]. */
export const COLORS: Record<ColorKey, [string, string]> = {
  red: ['#ff3b30', '#ff453a'],
  orange: ['#ff9500', '#ff9f0a'],
  yellow: ['#ffcc00', '#ffd60a'],
  green: ['#34c759', '#30d158'],
  mint: ['#00c7be', '#63e6e2'],
  teal: ['#30b0c7', '#40c8e0'],
  cyan: ['#32ade6', '#64d2ff'],
  blue: ['#007aff', '#0a84ff'],
  indigo: ['#5856d6', '#5e5ce6'],
  purple: ['#af52de', '#bf5af2'],
  pink: ['#ff2d55', '#ff375f'],
  brown: ['#a2845e', '#ac8e68'],
  gray: ['#8e8e93', '#98989d'],
};

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];

export const ICONS = [
  '☰',
  '✓',
  '★',
  '🛒',
  '🏠',
  '💼',
  '✈️',
  '🎒',
  '🏋️',
  '🍳',
  '📚',
  '🎁',
  '💡',
  '🧰',
  '🐾',
  '🌱',
  '🎬',
  '🎵',
];

export function colorVar(color: ColorKey): string {
  return `var(--c-${color})`;
}
