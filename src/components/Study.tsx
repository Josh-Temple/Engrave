import { useState, useRef } from 'react';
import { useStore, Segment } from '../store/useStore';
import { Flashcard } from './Card';
import { View } from '../App';
import { X, Check, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function generateFullText(segments: Segment[]): string {
  return segments.map(seg => {
    const word = seg[0];
    const ruby = seg[1];
    return ruby ? `<ruby>${word}<rt>${ruby}</rt></ruby>` : word;
  }).join("");
}

function generateClozeText(segments: Segment[], level: number, isAllClozed: boolean = false): string {
  if (!isAllClozed && level >= 4) return "Recall the full text...";
  
  const blankRatio = isAllClozed ? 1.0 : (level + 1) * 0.2; 
  
  return segments.map((seg, index) => {
    const word = seg[0];
    const ruby = seg[1];
    
    // Skip punctuation or spaces from being blanked if possible
    const isPunctuation = /^[\p{P}\p{S}\s]+$/u.test(word);
    
    let isBlank = false;
    if (!isPunctuation) {
      if (isAllClozed) {
        isBlank = true;
      } else {
        // Deterministic pseudo-random based on index
        const hash = (index * 2654435761) % 100;
        if (hash < blankRatio * 100) {
          isBlank = true;
        }
      }
    }
    
    if (isBlank) {
      const blankLength = Math.max(2, word.length);
      const blankStr = "＿".repeat(blankLength);
      // Hide the ruby text but keep the tag structure to prevent layout shifts
      return ruby ? `<ruby>${blankStr}<rt>&nbsp;</rt></ruby>` : blankStr;
    } else {
      return ruby ? `<ruby>${word}<rt>${ruby}</rt></ruby>` : word;
    }
  }).join("");
}

export function Study({ onNavigate, practiceItemId }: { onNavigate: (v: View) => void, practiceItemId?: string }) {
  const items = useStore((s) => s.items);
  const getDueItems = useStore((s) => s.getDueItems);
  const reviewItem = useStore((s) => s.reviewItem);
  const autoPlayAudioOnBack = useStore((s) => s.settings.autoPlayAudioOnBack);
  
  const isPractice = !!practiceItemId;
  const dueItems = isPractice ? [] : getDueItems();
  const practiceItem = isPractice ? items.find(i => i.id === practiceItemId) : null;
  
  const currentItem = isPractice ? practiceItem : dueItems[0];
  const [practiceDone, setPracticeDone] = useState(false);

  const [hasFlipped, setHasFlipped] = useState(false);
  const reverseRef = useRef<Record<string, boolean>>({});

  // Decide if this specific item should be presented in reverse mode
  if (currentItem && currentItem.level === 5 && reverseRef.current[currentItem.id] === undefined) {
    // 50% chance to test Title -> Text, 50% chance to test Text -> Title
    reverseRef.current[currentItem.id] = Math.random() > 0.5;
  }
  const isReverse = currentItem?.level === 5 ? reverseRef.current[currentItem.id] : false;

  const handleReview = (passed: boolean) => {
    if (!currentItem) return;
    if (isPractice) {
      setPracticeDone(true);
      setTimeout(() => onNavigate('home'), 500);
    } else {
      reviewItem(currentItem.id, passed);
      setHasFlipped(false);
    }
  };

  const getFrontText = () => {
    if (!currentItem) return "";
    if (isReverse) return generateFullText(currentItem.segments);
    return generateClozeText(currentItem.segments, currentItem.level, isPractice);
  };

  const getBackText = () => {
    if (!currentItem) return "";
    if (isReverse) return currentItem.source;
    return generateFullText(currentItem.segments);
  };

  const getHeader = () => {
    if (!currentItem) return "";
    if (isReverse) return "What is the name of this?";
    return currentItem.source;
  };

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
                resetKey={currentItem.id}
                audioDataUrl={currentItem.audioDataUrl}
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
                <Check size={40} strokeWidth={3} />
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

      {/* Action Buttons */}
      <div className="h-32 p-6 flex items-center justify-center gap-6">
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
              className="flex gap-6 w-full max-w-xs"
            >
              <button
                onClick={() => handleReview(false)}
                className="flex-1 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-colors"
              >
                <X size={28} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => handleReview(true)}
                className="flex-1 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center hover:bg-green-100 transition-colors"
              >
                <Check size={28} strokeWidth={2.5} />
              </button>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}
