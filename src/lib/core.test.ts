import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentText } from './segmentText';
import { escapeHtml, sanitizeSegments } from './textSafety';
import { normalizeBackupPayload, normalizeItem, useStore, type MemoryItem } from '../store/useStore';
import { findNextPlayableIndex, shouldContinueLoop } from './listening';
import { MAX_SESSION_AGAIN_REPEATS, rateSessionCard } from './reviewSession';

const item = (id: string, audioUrl?: string): MemoryItem => ({
  id, source: id, segments: [[id]], level: 0, nextReviewDate: 0, interval: 0,
  easeFactor: 2.5, repetitions: 0, createdAt: 0, audioUrl,
});

test('segmentText covers word, character, line, smart, CJK, emoji and punctuation', () => {
  assert.deepEqual(segmentText('Hi, 世界 😀', 'word', 'en'), [['Hi'], [','], [' '], ['世界'], [' '], ['😀']]);
  assert.deepEqual(segmentText('A😀。', 'character', 'other'), [['A'], ['😀'], ['。']]);
  assert.deepEqual(segmentText('a\n\nb', 'line', 'other'), [['a'], ['\n'], [''], ['\n'], ['b']]);
  assert.deepEqual(segmentText('日本語', 'smart', 'auto'), [['日'], ['本'], ['語']]);
});

test('segments and legacy audio are normalized without losing blank layout segments', () => {
  assert.deepEqual(sanitizeSegments([[''], ['\n'], ['語', ' ご ']]), [[''], ['\n'], ['語', 'ご']]);
  const migrated = normalizeItem({ ...item('old'), audioDataUrl: 'data:audio/wav;base64,AA==' });
  assert.equal(migrated?.audioUrl, 'data:audio/wav;base64,AA==');
  assert.equal(migrated?.audioDataUrl, undefined);
});

test('old backups import and normalize duplicate audio to the canonical field', () => {
  const backup = normalizeBackupPayload({ app: { items: [{ ...item('x'), audioDataUrl: 'legacy' }], settings: {} } });
  assert.equal(backup.app.items[0].audioUrl, 'legacy');
  assert.equal(backup.app.items[0].audioDataUrl, undefined);
});

test('Again session queue delays, completes on Good/Hard and is bounded', () => {
  let queue = { pending: ['a', 'b', 'c', 'd'], againCounts: {} };
  queue = rateSessionCard(queue, 'a', 'again');
  assert.deepEqual(queue.pending, ['b', 'c', 'a', 'd']);
  queue = { pending: ['a'], againCounts: { a: MAX_SESSION_AGAIN_REPEATS - 1 } };
  assert.deepEqual(rateSessionCard(queue, 'a', 'again').pending, []);
  assert.deepEqual(rateSessionCard({ pending: ['a', 'b'], againCounts: {} }, 'a', 'hard').pending, ['b']);
  assert.deepEqual(rateSessionCard({ pending: ['a', 'b'], againCounts: {} }, 'a', 'good').pending, ['b']);
});

test('persistent review ratings apply Again, Hard and Good scheduling policies', () => {
  for (const rating of ['again', 'hard', 'good'] as const) {
    useStore.setState({ items: [{ ...item(rating), level: 2, interval: 6, repetitions: 2 }] });
    useStore.getState().reviewItem(rating, rating);
    const reviewed = useStore.getState().items[0];
    assert.ok(reviewed.nextReviewDate > Date.now());
    if (rating === 'again') assert.equal(reviewed.level, 1);
    if (rating === 'hard') assert.equal(reviewed.level, 2);
    if (rating === 'good') assert.equal(reviewed.level, 3);
  }
});

test('playable navigation handles zero, one and multiple audio cards and loop policy', () => {
  assert.equal(findNextPlayableIndex([], 0, 1), -1);
  assert.equal(findNextPlayableIndex([item('a', 'audio')], 0, 1), 0);
  assert.equal(findNextPlayableIndex([item('a'), item('b', 'audio'), item('c', 'audio')], 0, 1), 1);
  assert.equal(findNextPlayableIndex([item('a'), item('b', 'audio'), item('c', 'audio')], 1, -1), 2);
  assert.equal(shouldContinueLoop(0, 0, false), false);
  assert.equal(shouldContinueLoop(0, 0, true), true);
});

test('dangerous HTML is escaped before the only raw ruby markdown path', () => {
  const malicious = '<script>alert(1)</script><iframe src="javascript:x"></iframe>';
  const safe = escapeHtml(malicious);
  assert.equal(safe.includes('<script'), false);
  assert.equal(safe.includes('<iframe'), false);
  assert.match(safe, /&lt;script&gt;/);
});
