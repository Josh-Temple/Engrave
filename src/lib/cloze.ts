import type { Segment } from '../store/useStore';
import { groupSegmentsForRendering, type SegmentRenderGroup } from '../components/SafeSegmentContent';

export type ClozeRenderGroup = SegmentRenderGroup & { blank?: boolean };

export function isPunctuationOrWhitespace(text: string): boolean {
  return /^[\p{P}\p{S}\s]+$/u.test(text);
}

/**
 * Cloze selection treats a reconstructed Markdown run as one atomic unit. This
 * prevents a delimiter such as `$` or `**` from being blanked independently.
 */
export function createClozeRenderGroups(segments: Segment[], level: number, isAllClozed = false): ClozeRenderGroup[] {
  const blankRatio = isAllClozed ? 1 : (level + 1) * 0.2;

  return groupSegmentsForRendering(segments).map((group) => {
    if (group.type === 'line-break') return group;
    const text = group.type === 'ruby' ? group.text : group.text;
    if (!text || isPunctuationOrWhitespace(text)) return group;
    const selectionIndex = group.type === 'ruby' ? group.segmentIndex : group.segmentIndexes[0];
    const blank = isAllClozed || (selectionIndex * 2654435761) % 100 < blankRatio * 100;
    return { ...group, blank };
  });
}

export function blankFor(text: string): string {
  return '＿'.repeat(Math.max(2, Array.from(text).length));
}
