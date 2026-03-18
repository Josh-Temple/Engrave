import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';
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
  autoPlayAudioOnBack?: boolean;
}

export function Flashcard({
  header,
  frontText,
  backText,
  onFlip,
  onFlipChange,
  resetKey,
  audioDataUrl,
  autoPlayAudioOnBack,
}: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      <motion.div
        className="w-full h-full relative preserve-3d cursor-pointer"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <div
          className={cn(
            'absolute inset-0 backface-hidden bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100',
            'flex flex-col p-8'
          )}
        >
          <span className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-4">{header}</span>
          <div className="flex-1 flex items-center justify-center overflow-y-auto">
            <div className="text-xl font-medium text-gray-900 leading-relaxed text-left w-full whitespace-pre-wrap [&_rt]:text-gray-400 [&_rt]:font-normal [&_rt]:text-[0.6em] [&>p]:mb-4 last:[&>p]:mb-0">
              <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                {frontText}
              </Markdown>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'absolute inset-0 backface-hidden bg-gray-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.1)]',
            'flex flex-col p-8 rotate-y-180'
          )}
        >
          <span className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-4">{header}</span>
          <div className="flex-1 flex items-center justify-center overflow-y-auto">
            <div className="text-xl font-medium text-white leading-relaxed text-left w-full whitespace-pre-wrap [&_rt]:text-gray-400 [&_rt]:font-normal [&_rt]:text-[0.6em] [&>p]:mb-4 last:[&>p]:mb-0">
              <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                {backText}
              </Markdown>
            </div>
          </div>

          {audioDataUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void playAudio();
              }}
              className="mt-4 w-full h-12 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
            >
              <Volume2 size={18} />
              <span className="text-sm font-medium">Play Audio</span>
            </button>
          )}
          {audioDataUrl && <audio ref={audioRef} src={audioDataUrl} preload="metadata" />}
        </div>
      </motion.div>
    </div>
  );
}
