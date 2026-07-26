import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Segment } from '../store/useStore';

export type SegmentRenderGroup =
  | { type: 'markdown'; text: string; segmentIndexes: number[] }
  | { type: 'ruby'; text: string; reading: string; segmentIndex: number }
  | { type: 'line-break'; segmentIndex: number };

/** Reconstructs Quick Add tokens while keeping ruby and line layout as boundaries. */
export function groupSegmentsForRendering(segments: Segment[]): SegmentRenderGroup[] {
  const groups: SegmentRenderGroup[] = [];

  segments.forEach(([text, reading], segmentIndex) => {
    if (reading) {
      groups.push({ type: 'ruby', text, reading, segmentIndex });
      return;
    }

    if (text === '\n' || text === '\r\n' || text === '\r') {
      groups.push({ type: 'line-break', segmentIndex });
      return;
    }

    const previous = groups.at(-1);
    if (previous?.type === 'markdown') {
      previous.text += text;
      previous.segmentIndexes.push(segmentIndex);
    } else {
      groups.push({ type: 'markdown', text, segmentIndexes: [segmentIndex] });
    }
  });

  return groups;
}

function MarkdownText({ text }: { text: string }) {
  if (!text) return <span />;
  const leading = text.match(/^\s*/u)?.[0] ?? '';
  const trailing = text.match(/\s*$/u)?.[0] ?? '';
  const markdown = text.slice(leading.length, text.length - trailing.length);
  return (
    <>
      {leading}
      {markdown && <Markdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ p: ({ children }) => <>{children}</> }}
      >
        {markdown}
      </Markdown>}
      {trailing}
    </>
  );
}

/** Raw HTML is never parsed; reading-bearing values remain React text nodes. */
export function SafeSegmentContent({ segments }: { segments: Segment[] }) {
  return <>{groupSegmentsForRendering(segments).map((group, index) => {
    if (group.type === 'ruby') {
      return <ruby key={index}>{group.text}<rt>{group.reading}</rt></ruby>;
    }
    if (group.type === 'line-break') return <br key={index} />;
    return <span key={index}><MarkdownText text={group.text} /></span>;
  })}</>;
}
