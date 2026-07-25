import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentText } from './segmentText';
import { sanitizeSegments } from './textSafety';
import { migratePersistedState, normalizeBackupPayload, normalizeItem, STORAGE_VERSION, useStore, type MemoryItem } from '../store/useStore';
import { findNextPlayableIndex, shouldContinueLoop } from './listening';
import { MAX_SESSION_AGAIN_REPEATS, rateSessionCard, shouldPersistSessionRating } from './reviewSession';
import { enqueueAudioDeletion, readAudioDeletionQueue, retryAudioDeletions } from './audioDeletionQueue';
import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SafeSegmentContent } from '../components/SafeSegmentContent';
import { isCurrentPlayRequest, shouldResumeManualNavigation } from './playbackState';
import { readFile } from 'node:fs/promises';

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

test('Zustand v1 persist envelope rehydrates through persist migration without losing valid data', async () => {
  const envelope = JSON.parse(JSON.stringify({ version: 1, state: { items: [
    { ...item('legacy'), note: 'memo', level: 3, interval: 6, easeFactor: 2.1, repetitions: 4, audioDataUrl: 'legacy-data', audioStoragePath: 'cards/a.wav' },
    { ...item('preferred'), audioUrl: 'canonical', audioDataUrl: 'duplicate' },
    { broken: true },
  ], settings: { autoPlayAudioOnBack: true, reviewOrder: 'random' } } }));
  const storage = {
    getItem: () => JSON.stringify(envelope), setItem: () => {}, removeItem: () => {},
  };
  const store = createStore(persist(() => ({ items: [] as MemoryItem[], settings: { autoPlayAudioOnBack: false, reviewOrder: 'listed' as const } }), {
    name: 'zencards-storage-v4', version: STORAGE_VERSION, migrate: migratePersistedState,
    storage: createJSONStorage(() => storage),
  }));
  await store.persist.rehydrate();
  const migrated = store.getState();
  assert.equal(STORAGE_VERSION, 2);
  assert.equal(migrated.items.length, 2);
  assert.deepEqual(migrated.items[0], { ...item('legacy'), note: 'memo', level: 3, interval: 6, easeFactor: 2.1, repetitions: 4, audioUrl: 'legacy-data', audioStoragePath: 'cards/a.wav' });
  assert.equal(migrated.items[1].audioUrl, 'canonical');
  assert.equal(migrated.items.some((card) => 'audioDataUrl' in card), false);
  assert.deepEqual(migrated.settings, envelope.state.settings);
});

test('Again session queue delays, completes on Good/Hard and is bounded', () => {
  let queue = { pending: ['a', 'b', 'c', 'd'], againCounts: {}, persistentlyReviewed: [] as string[] };
  queue = rateSessionCard(queue, 'a', 'again');
  assert.deepEqual(queue.pending, ['b', 'c', 'a', 'd']);
  queue = { pending: ['a'], againCounts: { a: MAX_SESSION_AGAIN_REPEATS - 1 }, persistentlyReviewed: ['a'] };
  assert.deepEqual(rateSessionCard(queue, 'a', 'again').pending, []);
  assert.deepEqual(rateSessionCard({ pending: ['a', 'b'], againCounts: {}, persistentlyReviewed: [] }, 'a', 'hard').pending, ['b']);
  assert.deepEqual(rateSessionCard({ pending: ['a', 'b'], againCounts: {}, persistentlyReviewed: [] }, 'a', 'good').pending, ['b']);
  assert.equal(shouldPersistSessionRating(queue, 'a'), false);
  assert.equal(shouldPersistSessionRating(queue, 'b'), true);
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

test('shared segment renderer supports math, layout and ruby without creating raw HTML', () => {
  const rendered = renderToStaticMarkup(createElement(SafeSegmentContent, { segments: [
    ['$E=mc^2$'], [' and text'], ['\n'], [''], ['日本', 'にほん'], ['中文', 'zhōng wén'],
    ['<script>alert(1)</script><img onerror="alert(2)">[bad](javascript:alert(3))'],
  ] }));
  assert.match(rendered, /class="katex"/);
  assert.match(rendered, /<span> and text<\/span>/);
  assert.match(rendered, /<span>\n<\/span><span><\/span>/);
  assert.match(rendered, /<ruby>日本<rt>にほん<\/rt><\/ruby>/);
  assert.match(rendered, /<ruby>中文<rt>zhōng wén<\/rt><\/ruby>/);
  assert.equal(rendered.includes('<script'), false);
  assert.equal(rendered.includes('<img'), false);
  assert.equal(rendered.includes('href="javascript:'), false);
  assert.match(rendered, /&lt;script&gt;/);
});

test('reading-bearing segments remain plain text rather than Markdown or LaTeX', () => {
  const rendered = renderToStaticMarkup(createElement(SafeSegmentContent, { segments: [['$x$', '**reading text**']] }));
  assert.equal(rendered.includes('katex'), false);
  assert.equal(rendered.includes('<strong>'), false);
  assert.match(rendered, /<ruby>\$x\$<rt>\*\*reading text\*\*<\/rt><\/ruby>/);
});

test('manual playback navigation and stale Promise tokens have explicit policy', () => {
  assert.equal(shouldResumeManualNavigation('playing'), true);
  assert.equal(shouldResumeManualNavigation('waiting-gap'), true);
  assert.equal(shouldResumeManualNavigation('paused'), false);
  assert.equal(isCurrentPlayRequest(1, 2), false);
  assert.equal(isCurrentPlayRequest(2, 2), true);
});

test('generated service worker prioritizes current cache and explicitly retained previous cache', async () => {
  const worker = await readFile('dist/sw.js', 'utf8');
  assert.match(worker, /caches\.open\(CACHE\)\)\.match\(request\)/);
  assert.match(worker, /previous \? \(await caches\.open\(previous\)\)\.match\(request\)/);
  assert.equal(worker.includes('caches.match(event.request)'), false);
  assert.match(worker, /fetch\(event\.request\).*catch\(\(\) => self\.matchCurrentThenPrevious\('\/index\.html'\)\)/s);
  assert.match(worker, /SKIP_WAITING/);
  assert.match(worker, /JSON\.stringify\(\{ current: CACHE, previous \}\)/);
  assert.match(worker, /!keep\.has\(key\).*caches\.delete\(key\)/);
});

test('audio deletion queue deduplicates, retries and removes successful paths', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  enqueueAudioDeletion('cards/a.mp3', storage, 1);
  enqueueAudioDeletion('cards/a.mp3', storage, 2);
  assert.deepEqual(readAudioDeletionQueue(storage), [{ path: 'cards/a.mp3', attempts: 2, lastAttemptAt: 2 }]);
  let failed = true;
  await retryAudioDeletions(async () => { if (failed) throw new Error('offline'); }, storage, 3);
  assert.equal(readAudioDeletionQueue(storage)[0].attempts, 3);
  failed = false;
  await retryAudioDeletions(async () => {}, storage, 4);
  assert.deepEqual(readAudioDeletionQueue(storage), []);
});
