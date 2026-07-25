export type PlaybackPhase = 'idle' | 'playing' | 'paused' | 'waiting-gap' | 'blocked';

export const shouldResumeManualNavigation = (phase: PlaybackPhase): boolean =>
  phase === 'playing' || phase === 'waiting-gap';

/** A resolved/rejected play Promise may update state only while it owns the latest token. */
export const isCurrentPlayRequest = (request: number, latestRequest: number): boolean =>
  request === latestRequest;
