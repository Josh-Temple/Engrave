import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, isBefore, startOfDay } from 'date-fns';

export type Segment = [string, string?]; // [text, ruby/pinyin]

export interface MemoryItem {
  id: string;
  source: string;
  segments: Segment[];
  level: number; // 0 to 5. 0=20% blank, 1=40%, 2=60%, 3=80%, 4=100% blank, 5=Reverse Mode
  nextReviewDate: number;
  interval: number;
  easeFactor: number;
  repetitions: number;
  createdAt: number;
}

interface AppState {
  items: MemoryItem[];
  addItem: (source: string, segments: Segment[]) => void;
  deleteItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<MemoryItem>) => void;
  reviewItem: (id: string, passed: boolean) => void;
  getDueItems: () => MemoryItem[];
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (source, segments) => {
        const newItem: MemoryItem = {
          id: crypto.randomUUID(),
          source,
          segments,
          level: 0,
          nextReviewDate: Date.now(),
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          createdAt: Date.now(),
        };
        set((state) => ({ items: [newItem, ...state.items] }));
      },

      deleteItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      },

      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      reviewItem: (id, passed) => {
        set((state) => {
          const items = state.items.map((item) => {
            if (item.id !== id) return item;

            let { interval, easeFactor, repetitions, level } = item;

            if (passed) {
              repetitions += 1;
              if (repetitions === 1) interval = 1;
              else if (repetitions === 2) interval = 6;
              else interval = Math.round(interval * easeFactor);
              
              // Increase difficulty level (max 5)
              level = Math.min(5, level + 1);
            } else {
              repetitions = 0;
              interval = 1;
              easeFactor = Math.max(1.3, easeFactor - 0.2);
              
              // Decrease difficulty level to relearn (min 0)
              level = Math.max(0, level - 1);
            }

            const nextReviewDate = addDays(new Date(), interval).getTime();

            return { ...item, interval, easeFactor, repetitions, level, nextReviewDate };
          });
          return { items };
        });
      },

      getDueItems: () => {
        const { items } = get();
        const today = startOfDay(new Date()).getTime();
        return items.filter((i) => isBefore(i.nextReviewDate, addDays(today, 1)));
      },
    }),
    { name: 'zencards-storage-v3' } // new storage key to avoid conflicts
  )
);
