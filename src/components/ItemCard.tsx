import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, BookOpen, Volume2, ArrowUp, ArrowDown, Play, Pause } from 'lucide-react';
import { MemoryItem } from '../store/useStore';
import { cn } from '../lib/utils';

interface ItemCardProps {
  item: MemoryItem;
  isDue: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPractice: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  isDue,
  onEdit,
  onDelete,
  onPractice,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) => {
  // Combine segments into a plain text preview
  const previewText = item.segments.map(seg => seg[0]).join('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleAudioPause = () => setIsPlaying(false);
    const handleAudioEnded = () => {
      setIsPlaying(false);
      audio.currentTime = 0;
    };

    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('pause', handleAudioPause);

    return () => {
      audio.removeEventListener('ended', handleAudioEnded);
      audio.removeEventListener('pause', handleAudioPause);
    };
  }, []);

  const handleAudioToggle = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    audioRef.current.currentTime = 0;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error(error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4 group">
      <div>
        <h2 className="text-lg font-medium text-gray-900 truncate">{item.source}</h2>
        <p className="text-sm text-gray-400 truncate mt-1">{previewText}</p>
        {item.audioDataUrl && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs text-gray-400">
            <Volume2 size={14} /> MP3
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3, 4, 5].map((dot) => (
          <div 
            key={dot} 
            className={cn(
              "w-2 h-2 rounded-full",
              dot <= item.level ? "bg-gray-900" : "bg-gray-200"
            )}
          />
        ))}
        <span className="text-xs text-gray-400 ml-2 font-medium">
          {item.level === 5 ? 'Mastered (Mixed)' : `Level ${item.level + 1}`}
        </span>
        {isDue && (
          <span className="ml-auto w-2 h-2 rounded-full bg-red-500" />
        )}
      </div>

      <div className="pt-1 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="w-9 h-9 rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center"
            title="Move card up"
            aria-label="Move card up"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="w-9 h-9 rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center"
            title="Move card down"
            aria-label="Move card down"
          >
            <ArrowDown size={16} />
          </button>
        </div>

        <div className="flex gap-2 ml-auto">
          {item.audioDataUrl && (
            <>
              <button
                onClick={() => void handleAudioToggle()}
                className="w-9 h-9 rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
                title={isPlaying ? 'Pause audio' : 'Play audio'}
                aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              >
                {isPlaying ? <Pause size={17} /> : <Play size={17} />}
              </button>
              <audio ref={audioRef} src={item.audioDataUrl} preload="metadata" />
            </>
          )}
          <button
            onClick={onPractice}
            className="w-9 h-9 rounded-full bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors inline-flex items-center justify-center"
            title="Practice Mode"
            aria-label="Open practice mode"
          >
            <BookOpen size={17} />
          </button>
          <button
            onClick={onEdit}
            className="w-9 h-9 rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
            aria-label="Edit card"
          >
            <Pencil size={17} />
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 rounded-full bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors inline-flex items-center justify-center"
            aria-label="Delete card"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
