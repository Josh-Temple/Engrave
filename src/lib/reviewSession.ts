export const MAX_SESSION_AGAIN_REPEATS = 3;

export interface ReviewSessionQueue {
  pending: string[];
  againCounts: Record<string, number>;
  persistentlyReviewed: string[];
}

export const shouldPersistSessionRating = (queue: ReviewSessionQueue, cardId: string): boolean =>
  !queue.persistentlyReviewed.includes(cardId);

export function rateSessionCard(
  queue: ReviewSessionQueue,
  cardId: string,
  rating: 'again' | 'hard' | 'good',
): ReviewSessionQueue {
  const pending = queue.pending.filter((id, index) => id !== cardId || index !== 0);
  const persistentlyReviewed = queue.persistentlyReviewed.includes(cardId)
    ? queue.persistentlyReviewed
    : [...queue.persistentlyReviewed, cardId];
  if (rating !== 'again') return { pending, againCounts: queue.againCounts, persistentlyReviewed };

  const count = (queue.againCounts[cardId] ?? 0) + 1;
  const againCounts = { ...queue.againCounts, [cardId]: count };
  if (count >= MAX_SESSION_AGAIN_REPEATS) return { pending, againCounts, persistentlyReviewed };

  // Put it 2–4 cards later when possible, otherwise at the session tail.
  const insertionIndex = Math.min(pending.length, 2 + ((count - 1) % 3));
  pending.splice(insertionIndex, 0, cardId);
  return { pending, againCounts, persistentlyReviewed };
}
