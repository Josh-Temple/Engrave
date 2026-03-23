import { Segment } from '../store/useStore';

export type QuickAddLanguage = 'auto' | 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'other';
export type SegmentationMode = 'word' | 'character' | 'line' | 'smart';

const LATIN_WORD_CHAR = /[\p{L}\p{N}'’_-]/u;
const PUNCTUATION_CHAR = /[\p{P}\p{S}]/u;
const CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々〆ヵヶ]/u;

export const isNewline = (char: string) => char === '\n' || char === '\r';
export const isWhitespace = (char: string) => /\s/u.test(char) && !isNewline(char);
export const isPunctuation = (char: string) => PUNCTUATION_CHAR.test(char);
export const isCJK = (char: string) => CJK_CHAR.test(char);

const toSegments = (tokens: string[]): Segment[] => tokens.filter((token) => token.length > 0).map((token) => [token]);

// Line mode must retain empty-string lines so formatted passages keep intentional blank rows.
const toLineSegments = (tokens: string[]): Segment[] => tokens.map((token) => [token]);

const tokenizeWordMode = (text: string): string[] => {
  const tokens: string[] = [];
  let currentWord = '';

  const pushCurrentWord = () => {
    if (currentWord) {
      tokens.push(currentWord);
      currentWord = '';
    }
  };

  for (const char of text) {
    if (char === '\r') continue;

    if (isNewline(char)) {
      pushCurrentWord();
      tokens.push('\n');
      continue;
    }

    if (isWhitespace(char)) {
      pushCurrentWord();
      tokens.push(char);
      continue;
    }

    if (isPunctuation(char)) {
      pushCurrentWord();
      tokens.push(char);
      continue;
    }

    if (LATIN_WORD_CHAR.test(char) || isCJK(char)) {
      currentWord += char;
      continue;
    }

    pushCurrentWord();
    tokens.push(char);
  }

  pushCurrentWord();
  return tokens;
};

const tokenizeCharacterMode = (text: string): string[] => {
  const tokens: string[] = [];
  for (const char of text) {
    if (char === '\r') continue;
    tokens.push(char === '\n' ? '\n' : char);
  }
  return tokens;
};

const tokenizeLineMode = (text: string): string[] => {
  const normalized = text.replace(/\r/g, '');
  const lines = normalized.split('\n');
  const tokens: string[] = [];

  lines.forEach((line, index) => {
    tokens.push(line);
    if (index < lines.length - 1) {
      tokens.push('\n');
    }
  });

  return tokens;
};

export const getSuggestedMode = (language: QuickAddLanguage): SegmentationMode => {
  switch (language) {
    case 'en':
    case 'es':
    case 'fr':
    case 'de':
      return 'word';
    case 'zh':
    case 'ja':
      return 'character';
    default:
      return 'smart';
  }
};

export const detectSmartMode = (text: string, language: QuickAddLanguage): Exclude<SegmentationMode, 'smart'> => {
  const suggested = getSuggestedMode(language);
  if (suggested !== 'smart') {
    return suggested;
  }

  const normalized = text.replace(/\r/g, '');
  const chars = Array.from(normalized).filter((char) => !isWhitespace(char) && !isNewline(char));
  if (chars.length === 0) {
    return 'word';
  }

  const cjkCount = chars.filter((char) => isCJK(char)).length;
  const spaceCount = Array.from(normalized).filter((char) => char === ' ').length;
  const cjkRatio = cjkCount / chars.length;

  if (cjkRatio >= 0.4 && spaceCount <= 1) {
    return 'character';
  }

  if (spaceCount >= 2 && cjkRatio < 0.2) {
    return 'word';
  }

  return cjkRatio >= 0.6 ? 'character' : 'word';
};

export function segmentText(rawText: string, mode: SegmentationMode, language: QuickAddLanguage): Segment[] {
  const resolvedMode = mode === 'smart' ? detectSmartMode(rawText, language) : mode;

  switch (resolvedMode) {
    case 'character':
      return toSegments(tokenizeCharacterMode(rawText));
    case 'line':
      return toLineSegments(tokenizeLineMode(rawText));
    case 'word':
    default:
      return toSegments(tokenizeWordMode(rawText));
  }
}
