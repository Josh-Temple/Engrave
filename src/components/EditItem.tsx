import { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { View } from '../App';
import { useStore, Segment } from '../store/useStore';

export function EditItem({ itemId, onNavigate }: { itemId: string; onNavigate: (v: View) => void }) {
  const items = useStore((s) => s.items);
  const updateItem = useStore((s) => s.updateItem);
  const item = items.find((i) => i.id === itemId);

  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [audioDataUrl, setAudioDataUrl] = useState<string>('');
  const [audioFileName, setAudioFileName] = useState('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (item) {
      setJsonInput(JSON.stringify({
        source: item.source,
        segments: item.segments,
        note: item.note
      }, null, 2));
      setMemo(item.note || '');
      setAudioDataUrl(item.audioDataUrl || '');
      setAudioFileName(item.audioDataUrl ? 'Current audio' : '');
    }
  }, [item]);

  if (!item) return null;

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
      if (parsed.note !== undefined && typeof parsed.note !== 'string') {
        throw new Error('Invalid JSON: "note" must be a string if provided.');
      }
      
      // Basic validation of segments
      for (const seg of parsed.segments) {
        if (!Array.isArray(seg) || typeof seg[0] !== 'string') {
          throw new Error('Invalid JSON: Each segment must be an array starting with a string.');
        }
      }

      updateItem(itemId, {
        source: parsed.source,
        segments: parsed.segments as Segment[],
        note: memo.trim() || parsed.note?.trim() || undefined,
        audioDataUrl: audioDataUrl || undefined
      });
      onNavigate('home');
    } catch (e: any) {
      setError(e.message || 'Invalid JSON format');
    }
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

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-gray-50">
      <div className="p-6 flex items-center justify-between bg-white border-b border-gray-100 sticky top-0 z-10">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-medium text-gray-900">Edit Card</h1>
        <button onClick={handleSave} className="p-2 -mr-2 text-gray-900 hover:text-gray-600 transition-colors">
          <Save size={24} />
        </button>
      </div>
      
      <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto pb-24">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Memo (optional)</p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Add context, translation, or reminders."
            className="w-full min-h-[96px] rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none resize-y focus:border-gray-400 transition-colors"
          />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Audio (MP3)</p>
            {audioDataUrl && (
              <button
                type="button"
                onClick={clearAudio}
                className="text-xs font-medium text-red-500 hover:text-red-600"
              >
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

        <textarea
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value);
            setError('');
          }}
          className="w-full flex-1 text-base font-mono text-gray-900 outline-none resize-none leading-relaxed bg-white p-4 rounded-2xl border border-gray-100 focus:border-gray-300 transition-colors min-h-[300px]"
        />
      </div>
    </div>
  );
}
