import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
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
  resetKey?: string;
}

export function Flashcard({ header, frontText, backText, onFlip, resetKey }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
  }, [resetKey]);

  const handleFlip = () => {
    if (!flipped && onFlip) onFlip();
    setFlipped(!flipped);
  };

  return (
    <div className="relative w-full aspect-[3/4] max-w-sm mx-auto perspective-1000" onClick={handleFlip}>
      <motion.div
        className="w-full h-full relative preserve-3d cursor-pointer"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Front */}
        <div className={cn(
          "absolute inset-0 backface-hidden bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100",
          "flex flex-col p-8"
        )}>
          <span className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-4">{header}</span>
          <div className="flex-1 flex items-center justify-center overflow-y-auto">
            <div className="text-xl font-medium text-gray-900 leading-relaxed text-left w-full whitespace-pre-wrap [&_rt]:text-gray-400 [&_rt]:font-normal [&_rt]:text-[0.6em] [&>p]:mb-4 last:[&>p]:mb-0">
              <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                {frontText}
              </Markdown>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className={cn(
          "absolute inset-0 backface-hidden bg-gray-900 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.1)]",
          "flex flex-col p-8 rotate-y-180"
        )}>
          <span className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-4">{header}</span>
          <div className="flex-1 flex items-center justify-center overflow-y-auto">
            <div className="text-xl font-medium text-white leading-relaxed text-left w-full whitespace-pre-wrap [&_rt]:text-gray-400 [&_rt]:font-normal [&_rt]:text-[0.6em] [&>p]:mb-4 last:[&>p]:mb-0">
              <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                {backText}
              </Markdown>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
