import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, Repeat1, SkipBack, SkipForward, Repeat, Headphones, BookAudio, TimerReset } from 'lucide-react';
import { MemoryItem, useStore } from '../store/useStore';
import { View } from '../App';
import 'katex/dist/katex.min.css';
import { findNextPlayableIndex, getAudioSource, shouldContinueLoop } from '../lib/listening';

type ListeningModeType = 'readListen' | 'listen';

const SPEED_OPTIONS = [0.8, 1.0, 1.2, 1.5] as const;
const GAP_OPTIONS = [0, 1, 2] as const;

function FullText({ item }: { item: MemoryItem }) {
  return <>{item.segments.map(([word, reading], index) => reading
    ? <ruby key={index}>{word}<rt>{reading}</rt></ruby>
    : <span key={index}>{word}</span>)}</>;
}

type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'waiting-gap' | 'blocked';

export function ListeningModes({ onNavigate, mode }: { onNavigate: (v: View) => void; mode: ListeningModeType }) {
  const items = useStore((s) => s.items);
  const orderedItems = items;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [repeatOne, setRepeatOne] = useState(false);
  const [loopAll, setLoopAll] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [gapSeconds, setGapSeconds] = useState<number>(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gapTimerRef = useRef<number | null>(null);
  const playAfterIndexChangeRef = useRef(false);
  const playRequestRef = useRef(0);
  const isPlaying = playbackStatus === 'playing';
  const clearGapTimer = () => {
    if (gapTimerRef.current !== null) window.clearTimeout(gapTimerRef.current);
    gapTimerRef.current = null;
  };

  useEffect(() => {
    if (currentIndex >= orderedItems.length && orderedItems.length > 0) {
      setCurrentIndex(orderedItems.length - 1);
    }
  }, [currentIndex, orderedItems.length]);

  const currentItem = orderedItems[currentIndex];
  const currentAudioSrc = getAudioSource(currentItem);
  const hasAnyAudio = useMemo(() => orderedItems.some((item) => Boolean(getAudioSource(item))), [orderedItems]);

  const stopPlayback = () => {
    clearGapTimer();
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setPlaybackStatus('paused');
  };

  useEffect(() => {
    return () => {
      clearGapTimer();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const startCurrent = async () => {
    clearGapTimer();
    const request = ++playRequestRef.current;
    if (!audioRef.current || !currentAudioSrc) {
      setPlaybackError('This card has no audio.');
      setPlaybackStatus('idle');
      return;
    }

    audioRef.current.playbackRate = playbackSpeed;
    setPlaybackError(null);

    try {
      await audioRef.current.play();
      if (request === playRequestRef.current) setPlaybackStatus('playing');
    } catch {
      if (request === playRequestRef.current) {
        playAfterIndexChangeRef.current = false;
        setPlaybackStatus('blocked');
        setPlaybackError('Playback was blocked by the browser. Tap play again after interacting with the page.');
      }
    }
  };

  const goToRelative = (direction: 1 | -1, audioOnly: boolean) => {
    if (orderedItems.length === 0) return;
    const nextIndex = audioOnly
      ? findNextPlayableIndex(orderedItems, currentIndex, direction)
      : (currentIndex + direction + orderedItems.length) % orderedItems.length;

    if (nextIndex === -1) {
      setPlaybackError('No cards with audio are available.');
      setPlaybackStatus('idle');
      return;
    }

    const shouldResume = isPlaying || playbackStatus === 'waiting-gap';
    stopPlayback();
    playAfterIndexChangeRef.current = shouldResume;
    setCurrentIndex(nextIndex);
    setPlaybackError(null);
  };

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    if (!playAfterIndexChangeRef.current) return;
    playAfterIndexChangeRef.current = false;
    void startCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const handleTogglePlay = async () => {
    if (!audioRef.current) return;
    clearGapTimer();
    playAfterIndexChangeRef.current = false;

    if (isPlaying) {
      audioRef.current.pause();
      ++playRequestRef.current;
      setPlaybackStatus('paused');
      return;
    }

    if (mode === 'listen' && !currentAudioSrc) {
      const firstPlayableIndex = findNextPlayableIndex(orderedItems, currentIndex, 1);
      if (firstPlayableIndex !== -1 && firstPlayableIndex !== currentIndex) {
        playAfterIndexChangeRef.current = true;
        setCurrentIndex(firstPlayableIndex);
        return;
      }
    }

    await startCurrent();
  };

  const handleEnded = () => {
    if (mode === 'readListen') {
      if (repeatOne) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
        void startCurrent();
        return;
      }
      setPlaybackStatus('idle');
      return;
    }

    const scheduleNext = () => {
      const nextPlayable = findNextPlayableIndex(orderedItems, currentIndex, 1);
      if (nextPlayable === -1) {
        setPlaybackStatus('idle');
        return;
      }

      if (!shouldContinueLoop(currentIndex, nextPlayable, loopAll)) {
        setPlaybackStatus('idle');
        return;
      }

      if (nextPlayable === currentIndex) {
        if (audioRef.current) audioRef.current.currentTime = 0;
        void startCurrent();
        return;
      }

      playAfterIndexChangeRef.current = true;
      setCurrentIndex(nextPlayable);
    };

    if (gapSeconds > 0) {
      setPlaybackStatus('waiting-gap');
      gapTimerRef.current = window.setTimeout(() => {
        gapTimerRef.current = null;
        scheduleNext();
      }, gapSeconds * 1000);
      return;
    }

    scheduleNext();
  };

  const viewTitle = mode === 'readListen' ? 'Read & Listen' : 'Listen';

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-gray-50">
      <div className="p-6 flex items-center justify-between">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors" aria-label="Back to library">
          <ArrowLeft size={24} />
        </button>
        <span className="text-sm font-medium text-gray-500 inline-flex items-center gap-2">
          {mode === 'readListen' ? <BookAudio size={16} /> : <Headphones size={16} />}
          {viewTitle}
        </span>
      </div>

      <div className="px-6 pb-6 flex-1 min-h-0 flex flex-col gap-4">
        {orderedItems.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">No cards yet. Add a card first.</div>
        ) : (
          <>
            <div className="rounded-3xl border border-gray-200 bg-white p-5">
              <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">{currentItem?.source || 'Card'}</div>
              <div className="text-xs text-gray-400 mb-3">{currentIndex + 1} / {orderedItems.length}</div>
              <div className="max-h-[42vh] overflow-y-auto overscroll-contain pr-1">
                <div className="text-lg leading-relaxed text-gray-900 whitespace-pre-wrap [&_rt]:text-gray-400 [&_rt]:font-normal [&_rt]:text-[0.6em]">
                  {currentItem ? <FullText item={currentItem} /> : null}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => goToRelative(-1, mode === 'listen')}
                  className="h-12 rounded-xl bg-gray-100 text-gray-700 inline-flex items-center justify-center"
                  aria-label="Previous"
                >
                  <SkipBack size={18} />
                </button>
                <button
                  onClick={() => void handleTogglePlay()}
                  className="h-12 rounded-xl bg-gray-900 text-white inline-flex items-center justify-center"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  disabled={!currentAudioSrc && mode === 'readListen'}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  onClick={() => goToRelative(1, mode === 'listen')}
                  className="h-12 rounded-xl bg-gray-100 text-gray-700 inline-flex items-center justify-center"
                  aria-label="Next"
                >
                  <SkipForward size={18} />
                </button>
              </div>

              {mode === 'readListen' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRepeatOne((prev) => !prev)}
                    className={`h-11 rounded-xl border inline-flex items-center justify-center gap-2 text-sm ${repeatOne ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    <Repeat1 size={16} /> Repeat 1
                  </button>
                  <label className="h-11 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm px-3 flex items-center gap-2">
                    <TimerReset size={16} />
                    <select
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      className="bg-transparent flex-1 outline-none"
                    >
                      {SPEED_OPTIONS.map((speed) => (
                        <option key={speed} value={speed}>{speed.toFixed(1)}x</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLoopAll((prev) => !prev)}
                    className={`h-11 rounded-xl border inline-flex items-center justify-center gap-2 text-sm ${loopAll ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    <Repeat size={16} /> Loop all
                  </button>
                  <label className="h-11 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm px-3 flex items-center gap-2">
                    <TimerReset size={16} />
                    <select
                      value={gapSeconds}
                      onChange={(e) => setGapSeconds(Number(e.target.value))}
                      className="bg-transparent flex-1 outline-none"
                    >
                      {GAP_OPTIONS.map((gap) => (
                        <option key={gap} value={gap}>{gap}s gap</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {mode === 'readListen' && !currentAudioSrc && (
                <p className="text-xs text-amber-600">This card has no audio. You can still read and move between cards.</p>
              )}
              {mode === 'listen' && !hasAnyAudio && (
                <p className="text-xs text-amber-600">No audio files found. Attach MP3 files from Create/Edit to use Listen mode.</p>
              )}
              {currentItem?.note && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] font-bold tracking-wider text-gray-500 uppercase mb-1">Memo</div>
                  <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{currentItem.note}</p>
                </div>
              )}
              {playbackError && <p className="text-xs text-red-500">{playbackError}</p>}
            </div>
          </>
        )}
      </div>

      <audio
        ref={audioRef}
        src={currentAudioSrc}
        preload="metadata"
        onEnded={handleEnded}
        onPause={() => setPlaybackStatus((status) => status === 'waiting-gap' ? status : 'paused')}
      />
    </div>
  );
}
