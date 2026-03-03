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

  useEffect(() => {
    if (item) {
      setJsonInput(JSON.stringify({
        source: item.source,
        segments: item.segments
      }, null, 2));
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
      
      // Basic validation of segments
      for (const seg of parsed.segments) {
        if (!Array.isArray(seg) || typeof seg[0] !== 'string') {
          throw new Error('Invalid JSON: Each segment must be an array starting with a string.');
        }
      }

      updateItem(itemId, { source: parsed.source, segments: parsed.segments as Segment[] });
      onNavigate('home');
    } catch (e: any) {
      setError(e.message || 'Invalid JSON format');
    }
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
