export type AudioStorageMode = 'local' | 'supabase';

export const LOCAL_MAX_AUDIO_FILE_SIZE_BYTES = 700 * 1024;

const getAudioStorageMode = (): AudioStorageMode => {
  const mode = import.meta.env.VITE_AUDIO_STORAGE_MODE;
  return mode === 'supabase' ? 'supabase' : 'local';
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read the audio file.'));
    reader.readAsDataURL(file);
  });

const validateAudioFile = (file: File) => {
  if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
    throw new Error('Only MP3 files are supported.');
  }
};

const prepareLocalAudio = async (file: File): Promise<string> => {
  if (file.size > LOCAL_MAX_AUDIO_FILE_SIZE_BYTES) {
    throw new Error(
      'Audio file is too large for reliable local storage. Please use an MP3 smaller than 700KB.',
    );
  }
  return readFileAsDataUrl(file);
};

const prepareSupabaseAudio = async (_file: File): Promise<string> => {
  // Migration stub: swap this implementation with Supabase Storage upload.
  throw new Error(
    'Supabase audio storage is not configured yet. Set VITE_AUDIO_STORAGE_MODE=local or implement src/lib/audioStorage.ts prepareSupabaseAudio.',
  );
};

export const prepareAudioForStorage = async (file: File): Promise<string> => {
  validateAudioFile(file);
  const mode = getAudioStorageMode();
  if (mode === 'supabase') {
    return prepareSupabaseAudio(file);
  }
  return prepareLocalAudio(file);
};
