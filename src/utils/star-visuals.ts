import * as THREE from 'three';

const SPECTRAL_COLORS: Record<string, string> = {
  O: '#9bb0ff',
  B: '#aabfff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4ea',
  K: '#ffd2a1',
  M: '#ffcc6f',
};

export function spectralColor(spectralType?: string): THREE.Color {
  if (!spectralType) return new THREE.Color('#ffffff');
  const letter = spectralType.charAt(0).toUpperCase();
  const hex = SPECTRAL_COLORS[letter] ?? '#ffffff';
  return new THREE.Color(hex);
}

export function starRadius(absMag?: number, apparentMag?: number): number {
  const mag = absMag ?? apparentMag ?? 10;
  const base = Math.max(0.02, 0.15 - mag * 0.01);
  return Math.min(0.35, Math.max(0.03, base));
}

export function formatDistanceLy(d: number): string {
  if (d < 1) return `${d.toFixed(3)} ly`;
  return `${d.toFixed(2)} ly`;
}

export function formatCatalogIds(ids?: Record<string, string>): string {
  if (!ids) return '';
  return Object.entries(ids)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}
