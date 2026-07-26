import type { Segment } from '../store/useStore';
import type { SegmentRenderGroup } from '../components/SafeSegmentContent';

export type ClozeRenderGroup = SegmentRenderGroup & { blank?: boolean };

export function isPunctuationOrWhitespace(text: string): boolean {
  return /^[\p{P}\p{S}\s]+$/u.test(text);
}

type TextRange = { start: number; end: number };

/** Finds the small set of inline constructs supported by the renderer. */
function markdownAtomicRanges(text: string): TextRange[] {
  const candidates: TextRange[] = [];
  const patterns = [
    /\$\$[\s\S]+?\$\$/gu,
    /(?<!\\)\$(?!\$)(?:\\.|[^$\n])+?(?<!\\)\$/gu,
    /`+[^\n]*?`+/gu,
    /\[[^\]\n]+\]\([^\s)]+(?:\s+"[^"]*")?\)/gu,
    /\*\*[^\n*]+\*\*/gu,
    /__[^\n_]+__/gu,
    /(?<!\*)\*(?!\*)[^\n*]+(?<!\*)\*(?!\*)/gu,
    /(?<!_)_(?!_)[^\n_]+(?<!_)_(?!_)/gu,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      candidates.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  candidates.sort((a, b) => a.start - b.start || b.end - a.end);
  const ranges: TextRange[] = [];
  for (const candidate of candidates) {
    if (!ranges.some((range) => candidate.start < range.end && candidate.end > range.start)) {
      ranges.push(candidate);
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

/**
 * Builds selection units independently from display reconstruction. Plain text
 * retains its original segment boundary; only complete Markdown/math constructs
 * spanning one or more segments are combined.
 */
export function createClozeUnits(segments: Segment[]): SegmentRenderGroup[] {
  const units: SegmentRenderGroup[] = [];
  let index = 0;
  while (index < segments.length) {
    const [text, reading] = segments[index];
    if (reading) {
      units.push({ type: 'ruby', text, reading, segmentIndex: index++ });
      continue;
    }
    const runStart = index;
    const run: Array<{ text: string; segmentIndex: number; start: number; end: number }> = [];
    let combined = '';
    while (index < segments.length && !segments[index][1]) {
      const value = segments[index][0];
      run.push({ text: value, segmentIndex: index, start: combined.length, end: combined.length + value.length });
      combined += value;
      index += 1;
    }
    const ranges = markdownAtomicRanges(combined);
    const pushPlain = (value: string, segmentIndex: number) => {
      if (['\n', '\r\n', '\r'].includes(value)) units.push({ type: 'line-break', segmentIndex });
      else units.push({ type: 'markdown', text: value, segmentIndexes: [segmentIndex] });
    };
    let offset = 0;
    for (const range of ranges) {
      for (const segment of run) {
        const start = Math.max(offset, segment.start);
        const end = Math.min(range.start, segment.end);
        if (end > start) pushPlain(combined.slice(start, end), segment.segmentIndex);
      }
      const indexes = run.filter((segment) => segment.end > range.start && segment.start < range.end)
        .map((segment) => segment.segmentIndex);
      units.push({ type: 'markdown', text: combined.slice(range.start, range.end), segmentIndexes: indexes });
      offset = range.end;
    }
    for (const segment of run) {
      const start = Math.max(offset, segment.start);
      if (segment.end > start) pushPlain(combined.slice(start, segment.end), segment.segmentIndex);
    }
    // Empty Advanced JSON segments are meaningful display units.
    if (run.length === 1 && combined === '') units.push({ type: 'markdown', text: '', segmentIndexes: [runStart] });
  }
  return units;
}

export function createClozeRenderGroups(segments: Segment[], level: number, isAllClozed = false): ClozeRenderGroup[] {
  const blankRatio = isAllClozed || level >= 4 ? 1 : Math.max(0, (level + 1) * 0.2);
  let selectableIndex = 0;

  return createClozeUnits(segments).map((group) => {
    if (group.type === 'line-break') return group;
    const text = group.text;
    if (!text || isPunctuationOrWhitespace(text)) return group;
    // The ordinal is derived solely from stable source order and excludes
    // punctuation/spacing, so renderer grouping cannot collapse every hash to 0.
    const hash = Math.imul(selectableIndex + 1, 2654435761) >>> 0;
    selectableIndex += 1;
    const blank = blankRatio === 1 || hash % 100 < blankRatio * 100;
    return { ...group, blank };
  });
}

export function blankFor(text: string): string {
  const blank = Array.from(text, (character) => character === '\n' || character === '\r' ? character : '＿').join('');
  return blank.length >= 2 ? blank : '＿＿';
}
