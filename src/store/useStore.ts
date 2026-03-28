import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, isBefore, startOfDay } from 'date-fns';
import { normalizeOptionalText, normalizeText, sanitizeSegments } from '../lib/textSafety';

export type Segment = [string, string?]; // [text, ruby/pinyin]
export type ReviewRating = 'again' | 'hard' | 'good';

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
  audioUrl?: string;
  audioDataUrl?: string;
  note?: string;
}

export interface AppSettings {
  autoPlayAudioOnBack: boolean;
  reviewOrder: 'listed' | 'random';
}

export interface BackupPayload {
  exportedAt: string;
  schemaVersion: number;
  app: {
    items: MemoryItem[];
    settings: AppSettings;
  };
}

interface AppState {
  items: MemoryItem[];
  settings: AppSettings;
  addItem: (source: string, segments: Segment[], audioUrl?: string, note?: string) => void;
  deleteItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<MemoryItem>) => void;
  reviewItem: (id: string, rating: ReviewRating) => void;
  moveItem: (id: string, direction: 'up' | 'down') => void;
  getDueItems: () => MemoryItem[];
  updateSettings: (updates: Partial<AppSettings>) => void;
  exportBackup: () => BackupPayload;
  importBackup: (payload: BackupPayload) => void;
}

const STORAGE_KEY = 'zencards-storage-v4';
const STORAGE_VERSION = 1;

const defaultSettings = (): AppSettings => ({
  autoPlayAudioOnBack: false,
  reviewOrder: 'listed',
});

const normalizeItem = (item: unknown): MemoryItem | null => {
  if (!item || typeof item !== 'object') return null;

  const candidate = item as Record<string, unknown>;
  if (typeof candidate.id !== 'string') return null;
  const normalizedSource = normalizeText(candidate.source);
  if (!normalizedSource) return null;

  const segments = sanitizeSegments(candidate.segments);
  if (!segments) return null;

  return {
    id: candidate.id,
    source: normalizedSource,
    segments,
    level: typeof candidate.level === 'number' ? candidate.level : 0,
    nextReviewDate: typeof candidate.nextReviewDate === 'number' ? candidate.nextReviewDate : Date.now(),
    interval: typeof candidate.interval === 'number' ? candidate.interval : 0,
    easeFactor: typeof candidate.easeFactor === 'number' ? candidate.easeFactor : 2.5,
    repetitions: typeof candidate.repetitions === 'number' ? candidate.repetitions : 0,
    createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
    audioUrl:
      typeof candidate.audioUrl === 'string'
        ? candidate.audioUrl
        : typeof candidate.audioDataUrl === 'string'
          ? candidate.audioDataUrl
          : undefined,
    audioDataUrl: typeof candidate.audioDataUrl === 'string' ? candidate.audioDataUrl : undefined,
    note: normalizeOptionalText(candidate.note),
  };
};

const normalizeSettings = (settings: unknown): AppSettings => {
  if (!settings || typeof settings !== 'object') {
    return defaultSettings();
  }

  const candidate = settings as Record<string, unknown>;
  return {
    autoPlayAudioOnBack:
      typeof candidate.autoPlayAudioOnBack === 'boolean'
        ? candidate.autoPlayAudioOnBack
        : defaultSettings().autoPlayAudioOnBack,
    reviewOrder:
      candidate.reviewOrder === 'random'
        ? 'random'
        : defaultSettings().reviewOrder,
  };
};

const normalizeBackupPayload = (payload: unknown): BackupPayload => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup file is invalid.');
  }

  const candidate = payload as Record<string, unknown>;
  const app = candidate.app;
  if (!app || typeof app !== 'object') {
    throw new Error('Backup file is missing app data.');
  }

  const appRecord = app as Record<string, unknown>;
  const rawItems = Array.isArray(appRecord.items) ? appRecord.items : [];
  const items = rawItems.map((item) => normalizeItem(item)).filter((item): item is MemoryItem => item !== null);

  if (items.length !== rawItems.length) {
    throw new Error('Backup file contains invalid items.');
  }

  const schemaVersion =
    typeof candidate.schemaVersion === 'number' && Number.isFinite(candidate.schemaVersion)
      ? candidate.schemaVersion
      : STORAGE_VERSION;

  return {
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date().toISOString(),
    schemaVersion,
    app: {
      items,
      settings: normalizeSettings(appRecord.settings),
    },
  };
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      items: [],
      settings: defaultSettings(),

      addItem: (source, segments, audioUrl, note) => {
        const normalizedSource = normalizeText(source);
        const normalizedSegments = sanitizeSegments(segments);
        if (!normalizedSource || !normalizedSegments || normalizedSegments.length === 0) {
          throw new Error('Item data is invalid.');
        }

        const newItem: MemoryItem = {
          id: crypto.randomUUID(),
          source: normalizedSource,
          segments: normalizedSegments,
          level: 0,
          nextReviewDate: Date.now(),
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          createdAt: Date.now(),
          audioUrl,
          audioDataUrl: audioUrl,
          note: normalizeOptionalText(note),
        };
        set((state) => ({ items: [newItem, ...state.items] }));
      },

      updateSettings: (updates) => {
        set((state) => ({ settings: { ...state.settings, ...updates } }));
      },

      deleteItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      },

      moveItem: (id, direction) => {
        set((state) => {
          const currentIndex = state.items.findIndex((item) => item.id === id);
          if (currentIndex === -1) return state;

          const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
          if (targetIndex < 0 || targetIndex >= state.items.length) return state;

          const reorderedItems = [...state.items];
          const [movedItem] = reorderedItems.splice(currentIndex, 1);
          reorderedItems.splice(targetIndex, 0, movedItem);

          return { items: reorderedItems };
        });
      },

      updateItem: (id, updates) => {
        const normalizedSegments =
          updates.segments === undefined ? undefined : sanitizeSegments(updates.segments);
        if (updates.segments !== undefined && !normalizedSegments) {
          throw new Error('Item segments are invalid.');
        }

        const normalizedSource =
          updates.source === undefined ? undefined : normalizeText(updates.source);
        if (updates.source !== undefined && !normalizedSource) {
          throw new Error('Item source is invalid.');
        }

        const normalizedUpdates: Partial<MemoryItem> = { ...updates };
        if (updates.source !== undefined) {
          normalizedUpdates.source = normalizedSource;
        }
        if (updates.segments !== undefined) {
          normalizedUpdates.segments = normalizedSegments;
        }
        if (updates.note !== undefined) {
          normalizedUpdates.note = normalizeOptionalText(updates.note);
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...normalizedUpdates } : item
          ),
        }));
      },

      reviewItem: (id, rating) => {
        set((state) => {
          const items = state.items.map((item) => {
            if (item.id !== id) return item;

            let { interval, easeFactor, repetitions, level } = item;
            const previousInterval = interval;

            if (rating === 'again') {
              repetitions = 0;
              interval = 1;
              easeFactor = Math.max(1.3, easeFactor - 0.2);
              level = Math.max(0, level - 1);
            } else if (rating === 'hard') {
              repetitions += 1;
              if (repetitions === 1) interval = 1;
              else if (repetitions === 2) interval = 3;
              else interval = Math.max(1, Math.round(previousInterval * 1.2));

              easeFactor = Math.max(1.3, easeFactor - 0.05);
            } else {
              repetitions += 1;
              if (repetitions === 1) interval = 1;
              else if (repetitions === 2) interval = 6;
              else interval = Math.round(previousInterval * easeFactor);

              level = Math.min(5, level + 1);
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

      exportBackup: () => ({
        exportedAt: new Date().toISOString(),
        schemaVersion: STORAGE_VERSION,
        app: {
          items: get().items,
          settings: get().settings,
        },
      }),

      importBackup: (payload) => {
        const normalized = normalizeBackupPayload(payload);
        set({
          items: normalized.app.items,
          settings: normalized.app.settings,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      partialize: (state) => ({
        items: state.items,
        settings: state.settings,
      }),
      migrate: (persistedState) => {
        const candidate = persistedState as Record<string, unknown> | undefined;
        const rawItems = Array.isArray(candidate?.items) ? candidate.items : [];
        return {
          items: rawItems.map((item) => normalizeItem(item)).filter((item): item is MemoryItem => item !== null),
          settings: normalizeSettings(candidate?.settings),
        };
      },
    }
  )
);
