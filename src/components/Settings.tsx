import { ArrowLeft } from 'lucide-react';
import { View } from '../App';
import { useStore } from '../store/useStore';

export function Settings({ onNavigate }: { onNavigate: (v: View) => void }) {
  const autoPlayAudioOnBack = useStore((s) => s.settings.autoPlayAudioOnBack);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 p-6 pt-10">
      <div className="flex items-center gap-2 mb-8">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-medium tracking-tight text-gray-900">Settings</h1>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Audio Playback</p>
            <h2 className="text-lg font-medium text-gray-900">Auto-play audio on card back</h2>
            <p className="text-sm text-gray-500 mt-1">
              When enabled, card audio starts automatically when the back side is shown.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoPlayAudioOnBack}
            onClick={() => updateSettings({ autoPlayAudioOnBack: !autoPlayAudioOnBack })}
            className={`relative w-14 h-8 rounded-full transition-colors ${autoPlayAudioOnBack ? 'bg-gray-900' : 'bg-gray-200'}`}
          >
            <span
              className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${
                autoPlayAudioOnBack ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
