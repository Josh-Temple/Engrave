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
import { generateClozeText } from '../components/ClozeSegmentContent';
import { createClozeRenderGroups } from './cloze';
import { fingerprintPrecache } from '../../scripts/generate-service-worker.mjs';

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
  assert.match(rendered, /class="katex"[\s\S]* and text<\/span>/);
  assert.match(rendered, /<br\/><span><span><\/span><\/span>/);
  assert.match(rendered, /<ruby>日本<rt>にほん<\/rt><\/ruby>/);
  assert.match(rendered, /<ruby>中文<rt>zhōng wén<\/rt><\/ruby>/);
  assert.equal(rendered.includes('<script'), false);
  assert.equal(rendered.includes('<img'), false);
  assert.equal(rendered.includes('href="javascript:'), false);
  assert.match(rendered, /&lt;script&gt;/);
});

test('Quick Add word, character and smart paths reconstruct math and Markdown', () => {
  for (const [mode, language] of [
    ['word', 'en'], ['character', 'ja'], ['smart', 'en'], ['smart', 'ja'],
  ] as const) {
    const rendered = renderToStaticMarkup(createElement(SafeSegmentContent, {
      segments: segmentText('$E=mc^2$', mode, language),
    }));
    assert.match(rendered, /class="katex"/, `${mode}/${language} should render KaTeX`);
  }

  for (const source of ['**bold**', '`code`', '[link](https://example.com)']) {
    const rendered = renderToStaticMarkup(createElement(SafeSegmentContent, {
      segments: segmentText(source, 'word', 'en'),
    }));
    if (source.startsWith('**')) assert.match(rendered, /<strong>bold<\/strong>/);
    if (source.startsWith('`')) assert.match(rendered, /<code>code<\/code>/);
    if (source.startsWith('[')) assert.match(rendered, /<a href="https:\/\/example.com">link<\/a>/);
  }
});

test('reconstructed rendering preserves ruby boundaries, blank lines and safe text', () => {
  const mixed = renderToStaticMarkup(createElement(SafeSegmentContent, {
    segments: [['日本', 'にほん'], [' '], ...segmentText('$E=mc^2$', 'character', 'ja')],
  }));
  assert.match(mixed, /<ruby>日本<rt>にほん<\/rt><\/ruby><span> <span class="katex"/);

  const multiline = renderToStaticMarkup(createElement(SafeSegmentContent, {
    segments: segmentText('First line\n\n$E=mc^2$', 'word', 'en'),
  }));
  assert.match(multiline, /First line<\/span><br\/><br\/><span><span class="katex"/);

  const attacks = [
    '<script>alert(1)</script>', '<img src=x onerror="alert(1)">',
    '[bad](javascript:alert(1))', '<svg onload="alert(1)"></svg>',
  ].join('\n');
  const unsafe = renderToStaticMarkup(createElement(SafeSegmentContent, {
    segments: segmentText(attacks, 'word', 'en'),
  }));
  assert.equal(/<(script|img|svg)\b/i.test(unsafe), false);
  assert.equal(/href="javascript:|<[^>]+\s(?:onerror|onload)=/i.test(unsafe), false);
});

test('Study cloze is progressive per source token and deterministic at real levels', () => {
  const segments = segmentText('The quick brown fox jumps over the lazy dog and runs away.', 'word', 'en');
  const levels = [0, 1, 2, 3, 4].map((level) => createClozeRenderGroups(segments, level));
  const selectable = (groups: ReturnType<typeof createClozeRenderGroups>) => groups.filter((group) =>
    group.type !== 'line-break' && !/^\s$|^[.,]$/u.test(group.text));
  const blankCount = (groups: ReturnType<typeof createClozeRenderGroups>) => selectable(groups).filter((group) => group.blank).length;
  assert.ok(blankCount(levels[0]) > 0);
  assert.ok(blankCount(levels[0]) < selectable(levels[0]).length);
  for (let level = 1; level < levels.length; level += 1) {
    assert.ok(blankCount(levels[level]) >= blankCount(levels[level - 1]));
  }
  assert.equal(blankCount(levels[4]), selectable(levels[4]).length);
  assert.deepEqual(createClozeRenderGroups(segments, 2), levels[2]);
  assert.equal(levels.flat().some((group) => group.type !== 'line-break' && /^[\s.,]+$/u.test(group.text) && group.blank), false);
});

test('Study cloze keeps math and Markdown constructs atomic without combining prose', () => {
  const mathSegments = segmentText('Remember $E=mc^2$ today and explain the equation clearly.', 'word', 'en');
  const mathUnits = createClozeRenderGroups(mathSegments, 0);
  const math = mathUnits.find((group) => group.type === 'markdown' && group.text === '$E=mc^2$');
  assert.ok(math);
  assert.ok(mathUnits.filter((group) => group.type === 'markdown' && /[A-Za-z]+/u.test(group.text)).length > 2);
  const visibleLevel = [0, 1, 2, 3].find((level) => !createClozeRenderGroups(mathSegments, level)
    .find((group) => group.type === 'markdown' && group.text === '$E=mc^2$')?.blank);
  assert.notEqual(visibleLevel, undefined);
  assert.match(renderToStaticMarkup(generateClozeText(mathSegments, visibleLevel!)), /class="katex"/);

  const displayMath: Parameters<typeof generateClozeText>[0] = [['$$'], ['\n'], ['E=mc^2'], ['\n'], ['$$']];
  const displayUnits = createClozeRenderGroups(displayMath, 0, true);
  assert.equal(displayUnits.length, 1);
  assert.equal(displayUnits[0].type, 'markdown');
  assert.equal(displayUnits[0].text, '$$\nE=mc^2\n$$');
  assert.equal(renderToStaticMarkup(generateClozeText(displayMath, 0, true)).match(/\n/gu)?.length, 2);

  const markdownSegments = segmentText('Read **this section** and use `npm test` today.', 'word', 'en');
  const markdownUnits = createClozeRenderGroups(markdownSegments, 0, true);
  assert.ok(markdownUnits.some((group) => group.type === 'markdown' && group.text === '**this section**' && group.blank));
  assert.ok(markdownUnits.some((group) => group.type === 'markdown' && group.text === '`npm test`' && group.blank));
  const visible = renderToStaticMarkup(createElement(SafeSegmentContent, { segments: markdownSegments }));
  assert.match(visible, /<strong>this section<\/strong>/);
  assert.match(visible, /<code>npm test<\/code>/);

  const practiceGroups = createClozeRenderGroups(segmentText('$E=mc^2$', 'word', 'en'), 0, true);
  assert.equal(practiceGroups.length, 1);
  assert.equal(practiceGroups[0].type, 'markdown');
  assert.equal(practiceGroups[0].blank, true);
  const blank = renderToStaticMarkup(generateClozeText(segmentText('$E=mc^2$', 'word', 'en'), 0, true));
  assert.equal(blank.includes('katex'), false);
  assert.equal(blank.includes('$'), false);

  const rubyBlank = renderToStaticMarkup(generateClozeText([['日本', 'にほん']], 0, true));
  assert.match(rubyBlank, /<ruby>＿＿<rt> <\/rt><\/ruby>/);
  assert.equal(createClozeRenderGroups([[' '], [',']], 0, true).some((group) => group.blank), false);
});

test('character, ruby, whitespace and blank-line cloze units retain layout', () => {
  const characters = segmentText('今日は良い天気です。', 'character', 'ja');
  const counts = [0, 1, 2, 3, 4].map((level) => createClozeRenderGroups(characters, level).filter((unit) => unit.blank).length);
  assert.ok(counts[0] > 0 && counts[0] < characters.length - 1);
  counts.slice(1).forEach((count, index) => assert.ok(count >= counts[index]));
  assert.equal(createClozeRenderGroups(characters, 4).at(-1)?.blank, undefined);

  const mixed: Parameters<typeof generateClozeText>[0] = [['日', 'に'], ['本', 'ほん'], [' '], ['language'], [' '], ['$x^2$']];
  const units = createClozeRenderGroups(mixed, 0);
  assert.equal(units.filter((unit) => unit.type === 'ruby').length, 2);
  assert.ok(units.some((unit) => unit.type === 'markdown' && unit.text === '$x^2$'));
  assert.ok(units.length > 3);

  for (const whitespace of [' ', '   ', '　', '\t']) {
    const markup = renderToStaticMarkup(createElement(SafeSegmentContent, { segments: [['a', 'A'], [whitespace], ['b', 'B']] }));
    assert.equal(markup, `<ruby>a<rt>A</rt></ruby><span>${whitespace}</span><ruby>b<rt>B</rt></ruby>`);
  }
  const lines = segmentText('First line\n\nSecond line', 'word', 'en');
  assert.equal(renderToStaticMarkup(generateClozeText(lines, 0, true)).match(/<br\/>/gu)?.length, 2);
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

test('service worker fingerprint covers every precache file content deterministically', () => {
  const base = [
    { path: '/index.html', content: '<main />' },
    { path: '/manifest.webmanifest', content: '{}' },
    { path: '/icon.svg', content: '<svg />' },
    { path: '/assets/app.js', content: 'app' },
    { path: '/sw.js', content: 'old worker' },
  ];
  const initial = fingerprintPrecache(base);
  assert.equal(initial, fingerprintPrecache([...base].reverse()));
  assert.equal(initial, fingerprintPrecache(base.map((entry) => entry.path === '/sw.js' ? { ...entry, content: 'new worker' } : entry)));
  for (const path of ['/index.html', '/manifest.webmanifest', '/icon.svg', '/assets/app.js']) {
    const changed = base.map((entry) => entry.path === path ? { ...entry, content: `${entry.content}!` } : entry);
    assert.notEqual(initial, fingerprintPrecache(changed), `${path} must affect fingerprint`);
  }
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
