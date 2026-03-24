import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, isBefore, startOfDay } from 'date-fns';

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
  audioDataUrl?: string;
  note?: string;
}

export interface AppSettings {
  autoPlayAudioOnBack: boolean;
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
  addItem: (source: string, segments: Segment[], audioDataUrl?: string, note?: string) => void;
  deleteItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<MemoryItem>) => void;
  reviewItem: (id: string, rating: ReviewRating) => void;
  getDueItems: () => MemoryItem[];
  updateSettings: (updates: Partial<AppSettings>) => void;
  exportBackup: () => BackupPayload;
  importBackup: (payload: BackupPayload) => void;
}

const STORAGE_KEY = 'zencards-storage-v4';
const STORAGE_VERSION = 1;

const defaultSettings = (): AppSettings => ({
  autoPlayAudioOnBack: false,
});

const normalizeOptionalNote = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeSegment = (segment: unknown): Segment | null => {
  if (!Array.isArray(segment) || typeof segment[0] !== 'string') return null;
  if (segment.length > 1 && typeof segment[1] !== 'string') return null;
  return [segment[0], typeof segment[1] === 'string' ? segment[1] : undefined];
};

const normalizeItem = (item: unknown): MemoryItem | null => {
  if (!item || typeof item !== 'object') return null;

  const candidate = item as Record<string, unknown>;
  if (typeof candidate.id !== 'string') return null;
  if (typeof candidate.source !== 'string') return null;
  if (!Array.isArray(candidate.segments)) return null;

  const segments = candidate.segments
    .map((segment) => normalizeSegment(segment))
    .filter((segment): segment is Segment => segment !== null);

  if (segments.length !== candidate.segments.length) return null;

  return {
    id: candidate.id,
    source: candidate.source,
    segments,
    level: typeof candidate.level === 'number' ? candidate.level : 0,
    nextReviewDate: typeof candidate.nextReviewDate === 'number' ? candidate.nextReviewDate : Date.now(),
    interval: typeof candidate.interval === 'number' ? candidate.interval : 0,
    easeFactor: typeof candidate.easeFactor === 'number' ? candidate.easeFactor : 2.5,
    repetitions: typeof candidate.repetitions === 'number' ? candidate.repetitions : 0,
    createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
    audioDataUrl: typeof candidate.audioDataUrl === 'string' ? candidate.audioDataUrl : undefined,
    note: normalizeOptionalNote(candidate.note),
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

      addItem: (source, segments, audioDataUrl, note) => {
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
          audioDataUrl,
          note: normalizeOptionalNote(note),
        };
        set((state) => ({ items: [newItem, ...state.items] }));
      },

      updateSettings: (updates) => {
        set((state) => ({ settings: { ...state.settings, ...updates } }));
      },

      deleteItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      },

      updateItem: (id, updates) => {
        const normalizedUpdates: Partial<MemoryItem> = {
          ...updates,
          note: updates.note === undefined ? undefined : normalizeOptionalNote(updates.note),
        };
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
