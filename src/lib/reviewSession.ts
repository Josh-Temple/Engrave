export const MAX_SESSION_AGAIN_REPEATS = 3;

export interface ReviewSessionQueue {
  pending: string[];
  againCounts: Record<string, number>;
}

export function rateSessionCard(
  queue: ReviewSessionQueue,
  cardId: string,
  rating: 'again' | 'hard' | 'good',
): ReviewSessionQueue {
  const pending = queue.pending.filter((id, index) => id !== cardId || index !== 0);
  if (rating !== 'again') return { pending, againCounts: queue.againCounts };

  const count = (queue.againCounts[cardId] ?? 0) + 1;
  const againCounts = { ...queue.againCounts, [cardId]: count };
  if (count >= MAX_SESSION_AGAIN_REPEATS) return { pending, againCounts };

  // Put it 2–4 cards later when possible, otherwise at the session tail.
  const insertionIndex = Math.min(pending.length, 2 + ((count - 1) % 3));
  pending.splice(insertionIndex, 0, cardId);
  return { pending, againCounts };
}
