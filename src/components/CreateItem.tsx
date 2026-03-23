import { useMemo, useState } from 'react';

import { ArrowLeft, Check, Copy, Save } from 'lucide-react';
import { View } from '../App';
import { segmentText, getSuggestedMode, QuickAddLanguage, SegmentationMode } from '../lib/segmentText';
import { useStore, Segment } from '../store/useStore';

const JSON_TEMPLATE = `{
  "source": "Enter source or title here",
  "segments": [
    ["Word1", "ruby1"],
    ["Word2"],
    ["Word3", "ruby3"]
  ]
}`;

const AI_PROMPT = `You are a data creation assistant for a language learning app.
Please convert the text provided by the user into the following JSON format.

[Rules]
1. "source" must contain the source or title of the text.
2. "segments" must be an array of arrays, where each element is in the format \`["Word", "ruby/pinyin"]\`.
3. For words, symbols, or spaces that do not need ruby/pinyin, omit the second element like \`["Word"]\`.
4. For languages with spaces (like English), include spaces as independent segments like \`[" "]\`.
5. Output ONLY valid JSON. Do not include any markdown formatting, explanations, or conversational text.

[Output Example (Chinese)]
{
  "source": "論語 学而第一",
  "segments": [
    ["子", "zǐ"], ["曰", "yuē"], ["、"],
    ["学", "xué"], ["而", "ér"], ["時", "shí"], ["習", "xí"], ["之", "zhī"], ["、"],
    ["不", "bù"], ["亦", "yì"], ["説", "yuè"], ["乎", "hū"], ["。"]
  ]
}`;

type CreateTab = 'quick' | 'advanced';

const LANGUAGE_OPTIONS: { value: QuickAddLanguage; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'other', label: 'Other' },
];

const MODE_OPTIONS: { value: SegmentationMode; label: string; help: string }[] = [
  { value: 'word', label: 'Word', help: 'Best for English and other spaced languages.' },
  { value: 'character', label: 'Character', help: 'Best for Chinese, Japanese, or fine-grained recall.' },
  { value: 'line', label: 'Line', help: 'Best for poems, speeches, and preserving line breaks.' },
  { value: 'smart', label: 'Smart', help: 'Rule-based automatic default based on language and text.' },
];

const tabButtonClass = (active: boolean) =>
  `flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
    active ? 'bg-gray-900 text-white shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-900'
  }`;

const formatPreviewToken = (token: string) => {
  if (token === '\n') return '↵';
  if (token === ' ') return '␠';
  return token;
};

export function CreateItem({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [activeTab, setActiveTab] = useState<CreateTab>('quick');
  const [quickSource, setQuickSource] = useState('');
  const [rawText, setRawText] = useState('');
  const [language, setLanguage] = useState<QuickAddLanguage>('auto');
  const [mode, setMode] = useState<SegmentationMode>(getSuggestedMode('auto'));
  const [hasManualModeOverride, setHasManualModeOverride] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [audioDataUrl, setAudioDataUrl] = useState<string>('');
  const [audioFileName, setAudioFileName] = useState('');
  const addItem = useStore((s) => s.addItem);

  const previewSegments = useMemo(() => segmentText(rawText, mode, language), [rawText, mode, language]);
  const selectedModeHelp = MODE_OPTIONS.find((option) => option.value === mode)?.help;
  const canSaveQuick = quickSource.trim().length > 0 && rawText.trim().length > 0 && previewSegments.length > 0;
  const canSaveAdvanced = jsonInput.trim().length > 0;

  const handleQuickSave = () => {
    setError('');

    if (!quickSource.trim()) {
      setError('Source / Title is required.');
      return;
    }

    if (!rawText.trim()) {
      setError('Raw text is required.');
      return;
    }

    const segments = segmentText(rawText, mode, language);
    if (segments.length === 0) {
      setError('Could not generate any segments from the provided text.');
      return;
    }

    addItem(quickSource.trim(), segments, audioDataUrl || undefined);
    onNavigate('home');
  };

  const handleAdvancedSave = () => {
    setError('');
    if (!jsonInput.trim()) return;

    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.source || typeof parsed.source !== 'string') {
        throw new Error('Invalid JSON: "source" must be a string.');
      }
      if (!Array.isArray(parsed.segments)) {
        throw new Error('Invalid JSON: "segments" must be an array.');
      }

      for (const seg of parsed.segments) {
        if (!Array.isArray(seg) || typeof seg[0] !== 'string') {
          throw new Error('Invalid JSON: Each segment must be an array starting with a string.');
        }
      }

      addItem(parsed.source, parsed.segments as Segment[], audioDataUrl || undefined);
      onNavigate('home');
    } catch (e: any) {
      setError(e.message || 'Invalid JSON format');
    }
  };

  const handleSave = () => {
    if (activeTab === 'quick') {
      handleQuickSave();
      return;
    }

    handleAdvancedSave();
  };

  const handleAudioUpload = (file?: File) => {
    if (!file) return;

    if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
      setError('Only MP3 files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAudioDataUrl(String(reader.result));
      setAudioFileName(file.name);
      setError('');
    };
    reader.onerror = () => setError('Failed to read the audio file.');
    reader.readAsDataURL(file);
  };

  const clearAudio = () => {
    setAudioDataUrl('');
    setAudioFileName('');
  };

  const copyToClipboard = async (text: string, type: 'template' | 'prompt') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'template') {
        setCopiedTemplate(true);
        setTimeout(() => setCopiedTemplate(false), 2000);
      } else {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleLanguageChange = (value: QuickAddLanguage) => {
    setLanguage(value);
    if (!hasManualModeOverride) {
      setMode(getSuggestedMode(value));
    }
    setError('');
  };

  const handleModeChange = (value: SegmentationMode) => {
    setMode(value);
    setHasManualModeOverride(true);
    setError('');
  };

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-gray-50">
      <div className="p-6 flex items-center justify-between bg-white border-b border-gray-100 sticky top-0 z-10">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-gray-900">Create Card</h1>
        <button
          onClick={handleSave}
          disabled={activeTab === 'quick' ? !canSaveQuick : !canSaveAdvanced}
          className="p-2 -mr-2 text-gray-900 hover:text-gray-600 disabled:text-gray-300 transition-colors"
          aria-label={activeTab === 'quick' ? 'Save quick add card' : 'Save advanced JSON card'}
        >
          <Save size={24} />
        </button>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto pb-24">
        <div className="bg-white border border-gray-100 rounded-2xl p-1 flex gap-1">
          <button type="button" onClick={() => setActiveTab('quick')} className={tabButtonClass(activeTab === 'quick')}>
            Quick Add
          </button>
          <button type="button" onClick={() => setActiveTab('advanced')} className={tabButtonClass(activeTab === 'advanced')}>
            Advanced JSON
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {activeTab === 'quick' ? (
          <>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Source / Title</label>
                <input
                  type="text"
                  value={quickSource}
                  onChange={(e) => {
                    setQuickSource(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g. The Raven, Favorite Quote, Lesson 3"
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-base text-gray-900 outline-none transition-colors focus:border-gray-300 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Language</label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as QuickAddLanguage)}
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-base text-gray-900 outline-none transition-colors focus:border-gray-300 focus:bg-white"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Segmentation Mode</label>
                  {!hasManualModeOverride && (
                    <span className="text-xs text-gray-400">Using suggested mode</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleModeChange(option.value)}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium text-left transition-colors ${
                        mode === option.value
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {selectedModeHelp && <p className="text-sm text-gray-500 mt-3">{selectedModeHelp}</p>}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Raw Text</label>
                <textarea
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    setError('');
                  }}
                  placeholder="Paste the text you want to memorize..."
                  className="w-full min-h-[180px] rounded-2xl border border-gray-100 bg-gray-50 p-4 text-base text-gray-900 outline-none resize-y leading-relaxed transition-colors focus:border-gray-300 focus:bg-white"
                />
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">Preview</p>
                <p className="text-sm text-gray-500">{previewSegments.length} segment{previewSegments.length === 1 ? '' : 's'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {previewSegments.slice(0, 30).map(([token], index) => (
                  <span
                    key={`${token}-${index}`}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700"
                  >
                    {formatPreviewToken(token)}
                  </span>
                ))}
                {previewSegments.length === 0 && (
                  <p className="text-sm text-gray-400">Generated segments will appear here as you type.</p>
                )}
              </div>
              {previewSegments.length > 30 && (
                <p className="text-sm text-gray-500">+ {previewSegments.length - 30} more</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => copyToClipboard(JSON_TEMPLATE, 'template')}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
              >
                {copiedTemplate ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                {copiedTemplate ? 'Copied!' : 'Copy Template'}
              </button>
              <button
                onClick={() => copyToClipboard(AI_PROMPT, 'prompt')}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-medium transition-colors"
              >
                {copiedPrompt ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                {copiedPrompt ? 'Copied!' : 'Copy AI Prompt'}
              </button>
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setError('');
              }}
              placeholder="Paste AI-generated JSON here..."
              className="w-full flex-1 text-base font-mono placeholder:text-gray-300 text-gray-900 outline-none resize-none leading-relaxed bg-white p-4 rounded-2xl border border-gray-100 focus:border-gray-300 focus:bg-white transition-colors min-h-[320px]"
            />
          </>
        )}

        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Audio (MP3)</p>
            {audioDataUrl && (
              <button type="button" onClick={clearAudio} className="text-xs font-medium text-red-500 hover:text-red-600">
                Remove
              </button>
            )}
          </div>
          <input
            type="file"
            accept="audio/mpeg,audio/mp3,.mp3"
            onChange={(e) => handleAudioUpload(e.target.files?.[0])}
            className="block w-full text-sm text-gray-500 file:mr-3 file:px-3 file:py-2 file:rounded-xl file:border-0 file:bg-gray-900 file:text-white hover:file:bg-gray-800"
          />
          {audioFileName && <p className="text-sm text-gray-500 truncate">Selected: {audioFileName}</p>}
          {audioDataUrl && (
            <audio controls className="w-full">
              <source src={audioDataUrl} type="audio/mpeg" />
            </audio>
          )}
        </div>
      </div>
    </div>
  );
}
