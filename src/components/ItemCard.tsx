import React from 'react';
import { Pencil, Trash2, BookOpen, Volume2 } from 'lucide-react';
import { MemoryItem } from '../store/useStore';
import { cn } from '../lib/utils';

interface ItemCardProps {
  item: MemoryItem;
  isDue: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPractice: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, isDue, onEdit, onDelete, onPractice }) => {
  // Combine segments into a plain text preview
  const previewText = item.segments.map(seg => seg[0]).join('');

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4 relative group">
      <div className="absolute top-6 right-6 flex gap-3">
        <button 
          onClick={onPractice}
          className="text-gray-300 hover:text-indigo-600 transition-colors"
          title="Practice Mode"
        >
          <BookOpen size={20} />
        </button>
        <button 
          onClick={onEdit}
          className="text-gray-300 hover:text-gray-900 transition-colors"
        >
          <Pencil size={20} />
        </button>
        <button 
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="pr-16">
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
    </div>
  );
}
