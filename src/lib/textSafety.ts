import type { Segment } from '../store/useStore';

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);

export const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  return value.trim();
};

export const normalizeOptionalText = (value: unknown): string | undefined => {
  const normalized = normalizeText(value);
  if (normalized === null || normalized.length === 0) return undefined;
  return normalized;
};

export const sanitizeSegment = (segment: unknown): Segment | null => {
  if (!Array.isArray(segment) || typeof segment[0] !== 'string') return null;
  if (segment.length > 1 && typeof segment[1] !== 'string') return null;

  const text = segment[0];
  const reading = normalizeOptionalText(segment[1]);
  return reading ? [text, reading] : [text];
};

export const sanitizeSegments = (segments: unknown): Segment[] | null => {
  if (!Array.isArray(segments)) return null;
  const normalized = segments
    .map((segment) => sanitizeSegment(segment))
    .filter((segment): segment is Segment => segment !== null);

  if (normalized.length !== segments.length) return null;
  return normalized;
};
