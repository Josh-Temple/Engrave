import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Segment } from '../store/useStore';

/**
 * Renders card body segments without ever parsing raw HTML.
 *
 * A segment with a reading is deliberately plain text inside trusted ruby/rt
 * elements. A segment without a reading supports Markdown and math. Rendering
 * each segment inline keeps segmentation, blank segments, and newlines intact.
 */
export function SafeSegmentContent({ segments }: { segments: Segment[] }) {
  return <>{segments.map(([text, reading], index) => {
    if (reading) return <ruby key={index}>{text}<rt>{reading}</rt></ruby>;
    if (!text.trim()) return <span key={index}>{text}</span>;

    // Markdown parsers trim boundary whitespace. Keep it outside the parser so
    // adjacent tokens, explicit line breaks, and blank layout segments survive.
    const leading = text.match(/^\s*/u)?.[0] ?? '';
    const trailing = text.match(/\s*$/u)?.[0] ?? '';
    const markdown = text.slice(leading.length, text.length - trailing.length);
    return (
      <span key={index}>
        {leading}
        {markdown && <Markdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{ p: ({ children }) => <>{children}</> }}
        >
          {markdown}
        </Markdown>}
        {trailing}
      </span>
    );
  })}</>;
}
