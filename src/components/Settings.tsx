import { useRef, useState } from 'react';
import { ArrowLeft, Download, Upload, ShieldCheck } from 'lucide-react';
import { View } from '../App';
import { BackupPayload, useStore } from '../store/useStore';

const formatTimestamp = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
};

export function Settings({ onNavigate }: { onNavigate: (v: View) => void }) {
  const autoPlayAudioOnBack = useStore((s) => s.settings.autoPlayAudioOnBack);
  const reviewOrder = useStore((s) => s.settings.reviewOrder);
  const updateSettings = useStore((s) => s.updateSettings);
  const itemsCount = useStore((s) => s.items.length);
  const exportBackup = useStore((s) => s.exportBackup);
  const importBackup = useStore((s) => s.importBackup);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backupMessage, setBackupMessage] = useState('');
  const [backupError, setBackupError] = useState('');

  const handleExport = () => {
    setBackupError('');

    const payload = exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `zencards-backup-${formatTimestamp(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setBackupMessage(`Backup downloaded with ${payload.app.items.length} card${payload.app.items.length === 1 ? '' : 's'}.`);
  };

  const handleImportClick = () => {
    setBackupError('');
    fileInputRef.current?.click();
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;

    setBackupMessage('');
    setBackupError('');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayload;
      importBackup(parsed);
      setBackupMessage(`Backup restored from ${file.name}.`);
    } catch (error) {
      console.error(error);
      setBackupError('Failed to restore backup. Please choose a valid ZenCards backup JSON file.');
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 p-6 pt-10">
      <div className="flex items-center gap-2 mb-8">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-medium tracking-tight text-gray-900">Settings</h1>
      </div>

      <div className="space-y-4">
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
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                autoPlayAudioOnBack ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 rounded-full bg-white transition-transform ${
                  autoPlayAudioOnBack ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Study Order</p>
          <h2 className="text-lg font-medium text-gray-900">Normal mode question order</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose whether daily review cards follow your Library order or are shuffled randomly.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => updateSettings({ reviewOrder: 'listed' })}
              className={`h-10 rounded-xl text-sm font-medium transition-colors ${
                reviewOrder === 'listed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Library order
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ reviewOrder: 'random' })}
              className={`h-10 rounded-xl text-sm font-medium transition-colors ${
                reviewOrder === 'random' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Random
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Backup & Restore</p>
              <h2 className="text-lg font-medium text-gray-900">Protect your cards before updates</h2>
              <p className="text-sm text-gray-500 mt-1">
                Download a JSON backup anytime and restore it later if you switch devices or something goes wrong.
              </p>
              <p className="text-sm text-gray-400 mt-3">Current cards: {itemsCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
            >
              <Download size={18} />
              Download backup
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
            >
              <Upload size={18} />
              Restore backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void handleImportFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Future app updates now keep a stable storage key and run data normalization during hydration to reduce compatibility issues.
          </div>

          {backupMessage && (
            <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              {backupMessage}
            </div>
          )}

          {backupError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {backupError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
