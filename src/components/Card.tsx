import { useState, useEffect, useRef } from 'react';
import { Volume2, ChevronUp, ChevronDown, Copy } from 'lucide-react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface FlashcardProps {
  header: string;
  frontText: string;
  backText: string;
  onFlip?: () => void;
  onFlipChange?: (isBackVisible: boolean) => void;
  resetKey?: string;
  audioDataUrl?: string;
  note?: string;
  autoPlayAudioOnBack?: boolean;
  onCopyBackText?: () => void;
  showBackCopyButton?: boolean;
  isMemoLifted?: boolean;
  onMemoToggle?: () => void;
}

const markdownClassName =
  'text-xl font-medium leading-relaxed text-left w-full whitespace-pre-wrap [&_rt]:text-gray-400 [&_rt]:font-normal [&_rt]:text-[0.6em] [&>p]:mb-4 last:[&>p]:mb-0';

function CardMarkdown({ text, className }: { text: string; className: string }) {
  return (
    <div className={cn(markdownClassName, className)}>
      <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
        {text}
      </Markdown>
    </div>
  );
}

export function Flashcard({
  header,
  frontText,
  backText,
  onFlip,
  onFlipChange,
  resetKey,
  audioDataUrl,
  note,
  autoPlayAudioOnBack,
  onCopyBackText,
  showBackCopyButton = false,
  isMemoLifted = false,
  onMemoToggle,
}: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasMemo = Boolean(note);

  useEffect(() => {
    setFlipped(false);
    onFlipChange?.(false);
  }, [resetKey, onFlipChange]);

  const playAudio = async () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    try {
      await audioRef.current.play();
    } catch {
      // autoplay can be blocked by browser policy
    }
  };

  const handleFlip = () => {
    const nextFlipped = !flipped;
    if (!flipped && onFlip) onFlip();
    setFlipped(nextFlipped);
    onFlipChange?.(nextFlipped);

    if (nextFlipped && audioDataUrl && autoPlayAudioOnBack) {
      void playAudio();
    }
  };

  return (
    <div className="relative w-full aspect-[3/4] max-w-sm mx-auto perspective-1000" onClick={handleFlip}>
      <div
        className="w-full h-full relative preserve-3d cursor-pointer"
        style={{
          transform: `rotateY(${flipped ? 180 : 0}deg)`,
          WebkitTransform: `rotateY(${flipped ? 180 : 0}deg)`,
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
          WebkitTransition: '-webkit-transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className={cn(
            'absolute inset-0 backface-hidden bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 overflow-hidden',
            'flex flex-col p-8 gap-4'
          )}
        >
          <span className="shrink-0 text-xs font-bold tracking-wider text-gray-400 uppercase">{header}</span>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
            <div className="min-h-full flex items-center">
              <CardMarkdown text={frontText} className="text-gray-900" />
            </div>
          </div>
        </div>

        <div
          className={cn(
            'absolute inset-0 backface-hidden bg-gray-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden',
            'flex flex-col p-8 gap-4 rotate-y-180'
          )}
        >
          {showBackCopyButton && onCopyBackText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopyBackText();
              }}
              className="absolute top-4 right-4 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
              aria-label="Copy source and text"
            >
              <Copy size={16} />
            </button>
          )}
          <span className="shrink-0 text-xs font-bold tracking-wider text-gray-500 uppercase">{header}</span>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
            <div className="min-h-full flex items-center">
              <CardMarkdown text={backText} className="text-white" />
            </div>
          </div>

          {(audioDataUrl || hasMemo) && (
            <div
              className={cn(
                'shrink-0',
                audioDataUrl && hasMemo ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1'
              )}
            >
              {audioDataUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void playAudio();
                  }}
                  className="w-full h-12 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                >
                  <Volume2 size={18} />
                  <span className="text-sm font-medium">Play Audio</span>
                </button>
              )}
              {hasMemo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMemoToggle?.();
                  }}
                  className="w-full h-12 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                >
                  {isMemoLifted ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  <span className="text-sm font-medium">{isMemoLifted ? 'Lower Memo' : 'Raise Memo'}</span>
                </button>
              )}
            </div>
          )}
          {audioDataUrl && <audio ref={audioRef} src={audioDataUrl} preload="metadata" />}
        </div>
      </div>
    </div>
  );
}
