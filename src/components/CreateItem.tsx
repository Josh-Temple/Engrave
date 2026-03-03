import { useState } from 'react';
import { ArrowLeft, Sparkles, Copy, Check } from 'lucide-react';
import { View } from '../App';
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

export function CreateItem({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const addItem = useStore((s) => s.addItem);

  const handleSave = () => {
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
      
      // Basic validation of segments
      for (const seg of parsed.segments) {
        if (!Array.isArray(seg) || typeof seg[0] !== 'string') {
          throw new Error('Invalid JSON: Each segment must be an array starting with a string.');
        }
      }

      addItem(parsed.source, parsed.segments as Segment[]);
      onNavigate('home');
    } catch (e: any) {
      setError(e.message || 'Invalid JSON format');
    }
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

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white">
      <div className="p-6 flex items-center justify-between">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <button 
          onClick={handleSave}
          disabled={!jsonInput.trim()}
          className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-300 transition-colors"
        >
          <Sparkles size={20} />
        </button>
      </div>
      
      <div className="flex-1 p-6 pt-2 flex flex-col gap-4">
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

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <textarea
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value);
            setError('');
          }}
          placeholder="Paste AI-generated JSON here..."
          className="w-full flex-1 text-base font-mono placeholder:text-gray-300 text-gray-900 outline-none resize-none leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 focus:border-gray-300 focus:bg-white transition-colors"
        />
      </div>
    </div>
  );
}
