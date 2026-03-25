import { motion, useDragControls } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Volume2, StickyNote, X } from 'lucide-react';
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
}

const markdownClassName =
  'text-xl font-medium leading-relaxed text-left w-full whitespace-pre-wrap [&_rt]:text-gray-400 [&_rt]:font-normal [&_rt]:text-[0.6em] [&>p]:mb-4 last:[&>p]:mb-0';

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
}: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const [memoDrawerState, setMemoDrawerState] = useState<'closed' | 'peek' | 'expanded'>('closed');
  const [drawerSizing, setDrawerSizing] = useState({ expandedHeight: 320, peekHeight: 190 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragControls = useDragControls();
  const hasMemo = Boolean(note);

  const { expandedHeight, peekHeight } = drawerSizing;
  const isMemoOpen = memoDrawerState !== 'closed';
  const shouldRenderMemoDrawer = hasMemo && flipped;

  useEffect(() => {
    const updateSizing = () => {
      const cardHeight = cardRef.current?.getBoundingClientRect().height ?? 0;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
      const dynamicPeekRatio = viewportHeight >= 900 ? 0.48 : 0.42;
      const expandedHeight = Math.max(280, Math.min(Math.round(cardHeight * 0.86), 520));
      const peekHeight = Math.max(170, Math.min(Math.round(cardHeight * dynamicPeekRatio), 300));

      setDrawerSizing({
        expandedHeight,
        peekHeight: Math.min(peekHeight, expandedHeight - 72),
      });
    };

    updateSizing();
    window.addEventListener('resize', updateSizing);
    return () => window.removeEventListener('resize', updateSizing);
  }, []);

  const getDrawerY = () => {
    if (memoDrawerState === 'expanded') return 0;
    if (memoDrawerState === 'peek') return expandedHeight - peekHeight;
    return expandedHeight + 20;
  };

  useEffect(() => {
    setFlipped(false);
    setMemoDrawerState('closed');
    onFlipChange?.(false);
  }, [resetKey, onFlipChange]);

  useEffect(() => {
    if (!hasMemo) {
      setMemoDrawerState('closed');
    }
  }, [hasMemo]);

  useEffect(() => {
    if (!hasMemo) return;
    setMemoDrawerState(flipped ? 'peek' : 'closed');
  }, [flipped, hasMemo]);

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
    if (isMemoOpen) return;
    const nextFlipped = !flipped;
    if (!flipped && onFlip) onFlip();
    setFlipped(nextFlipped);
    onFlipChange?.(nextFlipped);
    if (!nextFlipped) {
      setMemoDrawerState('closed');
    }

    if (nextFlipped && audioDataUrl && autoPlayAudioOnBack) {
      void playAudio();
    }
  };

  return (
    <div ref={cardRef} className="relative w-full aspect-[3/4] max-w-sm mx-auto perspective-1000" onClick={handleFlip}>
      <motion.div
        className="w-full h-full relative preserve-3d cursor-pointer"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
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
              <div className={cn(markdownClassName, 'text-gray-900')}>
                <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                  {frontText}
                </Markdown>
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'absolute inset-0 backface-hidden bg-gray-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden',
            'flex flex-col p-8 gap-4 rotate-y-180'
          )}
        >
          <span className="shrink-0 text-xs font-bold tracking-wider text-gray-500 uppercase">{header}</span>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
            <div className="min-h-full flex items-center">
              <div className={cn(markdownClassName, 'text-white')}>
                <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                  {backText}
                </Markdown>
              </div>
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
                    setMemoDrawerState((prev) => (prev === 'closed' ? 'peek' : 'closed'));
                  }}
                  className="w-full h-12 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                >
                  <StickyNote size={18} />
                  <span className="text-sm font-medium">Memo</span>
                </button>
              )}
            </div>
          )}
          {audioDataUrl && <audio ref={audioRef} src={audioDataUrl} preload="metadata" />}
        </div>
      </motion.div>

      {shouldRenderMemoDrawer && (
        <div
          className={cn(
            'absolute inset-0 z-20 transition-colors duration-200',
            isMemoOpen ? 'pointer-events-auto bg-black/10' : 'pointer-events-none bg-transparent'
          )}
          onClick={(e) => {
            e.stopPropagation();
            setMemoDrawerState('closed');
          }}
        >
          <motion.div
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: expandedHeight + 24 }}
            dragElastic={0.08}
            onDragEnd={(_, info) => {
              const downward = info.offset.y > 72 || info.velocity.y > 520;
              const upward = info.offset.y < -60 || info.velocity.y < -520;

              if (memoDrawerState === 'expanded') {
                setMemoDrawerState(downward ? 'peek' : 'expanded');
                return;
              }

              if (memoDrawerState === 'peek') {
                if (upward) {
                  setMemoDrawerState('expanded');
                  return;
                }
                setMemoDrawerState(downward ? 'closed' : 'peek');
              }
            }}
            animate={{ y: getDrawerY() }}
            transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.55 }}
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
            style={{ height: expandedHeight }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => {
                e.stopPropagation();
                dragControls.start(e);
              }}
            >
              <div className="h-1.5 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="px-5 pb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Memo</h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMemoDrawerState('closed');
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close memo"
              >
                <X size={16} />
              </button>
            </div>

            <div
              className={cn(
                'px-5 pb-5 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap',
                memoDrawerState === 'expanded' ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'
              )}
            >
              <p>{note}</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
