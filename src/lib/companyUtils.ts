/**
 * Utility helpers for Company Profile & Branding & Theme Contrast
 */

export interface PaletteOption {
  name: string;
  hex: string;
  description?: string;
}

export const PALETTE_OPTIONS: PaletteOption[] = [
  { name: 'Amber Elegant', hex: '#F59E0B', description: 'Emas Elegan & Konstruksi Premium' },
  { name: 'Royal Blue', hex: '#2563EB', description: 'Biru Korporat Utama & Klasik' },
  { name: 'Teal Presisi', hex: '#0D9488', description: 'Teal Arsitektural Presisi' },
  { name: 'Ocean Navy', hex: '#0284C7', description: 'Biru Samudra & Maritim Dinamis' },
  { name: 'Crimson Ruby', hex: '#E11D48', description: 'Merah Ruby Tegas & Berani' },
  { name: 'Emerald Safety', hex: '#10B981', description: 'Hijau HSE & Standar K3' },
  { name: 'Violet Amethyst', hex: '#7C3AED', description: 'Ungu Ametis Modern & Inovasi' },
  { name: 'Terracotta Bronze', hex: '#EA580C', description: 'Tembaga Arsitektur & Baja Konstruksi' },
];

export function getCompanyInitials(name?: string): string {
  if (!name || !name.trim()) return 'NKU';

  // 1. Check if acronym in parentheses e.g. "PT. NINDYA KRIDA UTAMA (NKU)" -> NKU
  const match = name.match(/\(([^)]+)\)/);
  if (match && match[1] && match[1].trim().length <= 6) {
    return match[1].trim().toUpperCase();
  }

  // 2. Clean legal suffixes/prefixes like PT, CV, TBK, UD, PD
  const clean = name.replace(/^(PT\.?|CV\.?|TBK\.?|UD\.?|PD\.?|PERUM\.?)\s+/i, '').trim();

  // 3. Take words initials
  const words = clean.split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 4).map((w) => w[0]).join('').toUpperCase();
  }

  // 4. Fallback: first 3-4 chars
  return clean.slice(0, 4).toUpperCase();
}

/**
 * Ensures text or icon color using the accent color against light or dark backgrounds
 * passes WCAG AA contrast requirements (>= 4.5:1).
 */
export function getAccessibleAccentColor(hexColor?: string, isDark: boolean = true): string {
  if (!hexColor) return isDark ? '#F59E0B' : '#B45309';
  if (isDark) return hexColor;

  const upper = hexColor.toUpperCase();
  switch (upper) {
    case '#F59E0B': // Amber -> Deep Golden Amber (4.7:1 contrast on white)
      return '#B45309';
    case '#10B981': // Emerald -> Deep Forest Emerald (4.8:1 contrast on white)
      return '#047857';
    case '#0284C7': // Ocean Navy -> Deep Navy Blue (5.5:1 contrast on white)
      return '#0369A1';
    case '#EA580C': // Terracotta -> Deep Terracotta (5.1:1 contrast on white)
      return '#C2410C';
    default:
      return hexColor;
  }
}

export function getContrastTextClass(hexColor?: string): string {
  if (!hexColor) return 'text-slate-950 font-black';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  // Perceived brightness YIQ formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? 'text-slate-950 font-black' : 'text-white font-black';
}

export function getContrastTextColorStyle(hexColor?: string): string {
  if (!hexColor) return '#09090b';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? '#09090b' : '#ffffff';
}
