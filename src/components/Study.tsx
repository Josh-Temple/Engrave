import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore, Segment, ReviewRating } from '../store/useStore';
import { Flashcard } from './Card';
import { View } from '../App';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type HintStage = 0 | 1 | 2;

function isPunctuationOrWhitespace(word: string): boolean {
  return /^[\p{P}\p{S}\s]+$/u.test(word);
}

function generateFullText(segments: Segment[]): string {
  return segments.map((seg) => {
    const word = seg[0];
    const ruby = seg[1];
    return ruby ? `<ruby>${word}<rt>${ruby}</rt></ruby>` : word;
  }).join('');
}

function generateClozeText(segments: Segment[], level: number, isAllClozed = false): string {
  const blankRatio = isAllClozed ? 1.0 : (level + 1) * 0.2;

  return segments.map((seg, index) => {
    const word = seg[0];
    const ruby = seg[1];
    const isPunctuation = isPunctuationOrWhitespace(word);

    let isBlank = false;
    if (!isPunctuation) {
      if (isAllClozed) {
        isBlank = true;
      } else {
        const hash = (index * 2654435761) % 100;
        if (hash < blankRatio * 100) {
          isBlank = true;
        }
      }
    }

    if (isBlank) {
      const blankLength = Math.max(2, word.length);
      const blankStr = '＿'.repeat(blankLength);
      return ruby ? `<ruby>${blankStr}<rt>&nbsp;</rt></ruby>` : blankStr;
    }

    return ruby ? `<ruby>${word}<rt>${ruby}</rt></ruby>` : word;
  }).join('');
}

function generateFirstCharacterHint(segments: Segment[]): string {
  return segments.map(([word]) => {
    if (isPunctuationOrWhitespace(word)) return word;

    const visibleChars = Array.from(word);
    const skeleton = `${visibleChars[0] ?? ''}${'＿'.repeat(Math.max(1, visibleChars.length - 1))}`;
    return skeleton;
  }).join('');
}

function shouldRevealToken(index: number, word: string): boolean {
  const visibleLength = Array.from(word).length;
  const hash = (index * 37 + visibleLength * 17) % 10;
  return hash < 3;
}

function generateLightRevealHint(segments: Segment[]): string {
  return segments.map((seg, index) => {
    const word = seg[0];
    const ruby = seg[1];

    if (isPunctuationOrWhitespace(word)) return word;
    if (shouldRevealToken(index, word)) {
      return ruby ? `<ruby>${word}<rt>${ruby}</rt></ruby>` : word;
    }

    const blankStr = '＿'.repeat(Math.max(2, Array.from(word).length));
    return ruby ? `<ruby>${blankStr}<rt>&nbsp;</rt></ruby>` : blankStr;
  }).join('');
}

export function Study({ onNavigate, practiceItemId }: { onNavigate: (v: View) => void, practiceItemId?: string }) {
  const items = useStore((s) => s.items);
  const getDueItems = useStore((s) => s.getDueItems);
  const reviewItem = useStore((s) => s.reviewItem);
  const autoPlayAudioOnBack = useStore((s) => s.settings.autoPlayAudioOnBack);
  const reviewOrder = useStore((s) => s.settings.reviewOrder);

  const isPractice = !!practiceItemId;
  const listedDueItems = isPractice ? [] : getDueItems();
  const dueKey = listedDueItems.map((item) => item.id).join('|');
  const dueItems = useMemo(() => {
    if (isPractice) return [];
    if (reviewOrder === 'listed') return listedDueItems;

    const shuffled = [...listedDueItems];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [dueKey, isPractice, listedDueItems, reviewOrder]);
  const practiceItem = isPractice ? items.find((i) => i.id === practiceItemId) : null;

  const currentItem = isPractice ? practiceItem : dueItems[0];
  const [practiceDone, setPracticeDone] = useState(false);
  const [hasFlipped, setHasFlipped] = useState(false);
  const [hintStage, setHintStage] = useState<HintStage>(0);
  const reverseRef = useRef<Record<string, boolean>>({});

  if (currentItem && currentItem.level === 5 && reverseRef.current[currentItem.id] === undefined) {
    reverseRef.current[currentItem.id] = Math.random() > 0.5;
  }
  const isReverse = currentItem?.level === 5 ? reverseRef.current[currentItem.id] : false;
  const isFullRecallFront = !!currentItem && !isReverse && currentItem.level >= 4;

  useEffect(() => {
    setHasFlipped(false);
    setHintStage(0);
  }, [currentItem?.id]);

  const handleReview = (rating: ReviewRating) => {
    if (!currentItem) return;
    if (isPractice) {
      setPracticeDone(true);
      setTimeout(() => onNavigate('home'), 500);
      return;
    }

    reviewItem(currentItem.id, rating);
  };

  const getFrontText = () => {
    if (!currentItem) return '';
    if (isReverse) return generateFullText(currentItem.segments);
    if (isFullRecallFront) {
      if (hintStage === 0) return 'Recall the full text...';
      if (hintStage === 1) return generateFirstCharacterHint(currentItem.segments);
      return generateLightRevealHint(currentItem.segments);
    }

    return generateClozeText(currentItem.segments, currentItem.level, isPractice);
  };

  const getBackText = () => {
    if (!currentItem) return '';
    if (isReverse) return currentItem.source;
    return generateFullText(currentItem.segments);
  };

  const getHeader = () => {
    if (!currentItem) return '';
    if (isReverse) return 'What is the name of this?';
    return currentItem.source;
  };

  const hintButtonLabel = hintStage === 0 ? 'Need a hint?' : 'Show one more hint';

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-gray-50">
      <div className="p-6 flex items-center justify-between">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <span className="text-sm font-medium text-gray-400">
          {isPractice ? 'Practice Mode' : `${dueItems.length} left`}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <AnimatePresence mode="wait">
          {currentItem && !practiceDone ? (
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <Flashcard
                header={getHeader()}
                frontText={getFrontText()}
                backText={getBackText()}
                onFlip={() => setHasFlipped(true)}
                resetKey={`${currentItem.id}:${hintStage}`}
                audioDataUrl={currentItem.audioUrl || currentItem.audioDataUrl}
                note={currentItem.note}
                autoPlayAudioOnBack={autoPlayAudioOnBack}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-2xl font-medium text-gray-900 mb-2">
                {isPractice ? 'Practice Finished!' : 'All done!'}
              </h2>
              <p className="text-gray-400 mb-8">
                {isPractice ? 'You have completed this text.' : "You've reviewed all texts for today."}
              </p>
              <button
                onClick={() => onNavigate('home')}
                className="w-full max-w-xs h-16 bg-gray-900 text-white rounded-2xl font-medium text-lg hover:bg-gray-800 transition-colors shadow-lg"
              >
                Back to Library
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-36 p-6 flex flex-col items-center justify-center gap-3">
        {currentItem && !hasFlipped && isFullRecallFront && hintStage < 2 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs text-center"
          >
            <p className="text-xs text-gray-400 mb-3">Try first. Use a hint only if needed.</p>
            <button
              type="button"
              onClick={() => setHintStage((stage) => Math.min(2, stage + 1) as HintStage)}
              className="w-full h-12 rounded-2xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {hintButtonLabel}
            </button>
          </motion.div>
        )}

        {currentItem && hasFlipped && (
          isPractice ? (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onNavigate('home')}
              className="w-full max-w-xs h-16 bg-gray-900 text-white rounded-2xl font-medium text-lg hover:bg-gray-800 transition-colors shadow-lg"
            >
              Finish Practice
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3 w-full max-w-sm"
            >
              <button
                onClick={() => handleReview('again')}
                className="h-16 bg-red-50 text-red-500 rounded-2xl text-sm font-semibold hover:bg-red-100 transition-colors"
              >
                Again
              </button>
              <button
                onClick={() => handleReview('hard')}
                className="h-16 bg-amber-50 text-amber-600 rounded-2xl text-sm font-semibold hover:bg-amber-100 transition-colors"
              >
                Hard
              </button>
              <button
                onClick={() => handleReview('good')}
                className="h-16 bg-green-50 text-green-600 rounded-2xl text-sm font-semibold hover:bg-green-100 transition-colors"
              >
                Good
              </button>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}
