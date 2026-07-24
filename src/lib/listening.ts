import type { MemoryItem } from '../store/useStore';

export const getAudioSource = (item?: MemoryItem): string | undefined => item?.audioUrl || item?.audioDataUrl;

export function findNextPlayableIndex(items: MemoryItem[], fromIndex: number, direction: 1 | -1): number {
  if (items.length === 0) return -1;
  let cursor = fromIndex;
  for (let checked = 0; checked < items.length; checked += 1) {
    cursor = (cursor + direction + items.length) % items.length;
    if (getAudioSource(items[cursor])) return cursor;
  }
  return -1;
}

export function shouldContinueLoop(currentIndex: number, nextIndex: number, loopAll: boolean): boolean {
  return nextIndex > currentIndex || loopAll;
}
