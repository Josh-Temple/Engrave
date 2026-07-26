import type { ReactNode } from 'react';
import type { Segment } from '../store/useStore';
import { blankFor, createClozeRenderGroups } from '../lib/cloze';
import { SafeSegmentContent } from './SafeSegmentContent';

export function generateClozeText(segments: Segment[], level: number, isAllClozed = false): ReactNode {
  return <>{createClozeRenderGroups(segments, level, isAllClozed).map((group, index) => {
    if (group.type === 'line-break') return <br key={index} />;
    if (group.type === 'ruby') {
      return group.blank
        ? <ruby key={index}>{blankFor(group.text)}<rt>&nbsp;</rt></ruby>
        : <ruby key={index}>{group.text}<rt>{group.reading}</rt></ruby>;
    }
    return group.blank
      ? <span key={index}>{blankFor(group.text)}</span>
      : <SafeSegmentContent key={index} segments={[[group.text]]} />;
  })}</>;
}
