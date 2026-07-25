const QUEUE_KEY = 'engrave-audio-deletion-queue-v1';
const MAX_ATTEMPTS = 5;

export interface AudioDeletionEntry { path: string; attempts: number; lastAttemptAt: number }

export const readAudioDeletionQueue = (storage: Pick<Storage, 'getItem'> = localStorage): AudioDeletionEntry[] => {
  try {
    const value: unknown = JSON.parse(storage.getItem(QUEUE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((entry): entry is AudioDeletionEntry =>
      Boolean(entry && typeof entry.path === 'string' && typeof entry.attempts === 'number' && typeof entry.lastAttemptAt === 'number')) : [];
  } catch { return []; }
};

export const enqueueAudioDeletion = (
  path: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
  now = Date.now(),
) => {
  if (!path) return;
  const queue = readAudioDeletionQueue(storage);
  const existing = queue.find((entry) => entry.path === path);
  if (existing) { existing.attempts += 1; existing.lastAttemptAt = now; }
  else queue.push({ path, attempts: 1, lastAttemptAt: now });
  storage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const retryAudioDeletions = async (
  remove: (path: string) => Promise<void>,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
  now = Date.now(),
) => {
  const queue = readAudioDeletionQueue(storage);
  const remaining: AudioDeletionEntry[] = [];
  for (const entry of queue) {
    if (entry.attempts >= MAX_ATTEMPTS) { remaining.push(entry); continue; }
    try { await remove(entry.path); }
    catch (error) {
      console.error('Deferred audio cleanup failed:', entry.path, error);
      remaining.push({ ...entry, attempts: entry.attempts + 1, lastAttemptAt: now });
    }
  }
  storage.setItem(QUEUE_KEY, JSON.stringify(remaining));
};
