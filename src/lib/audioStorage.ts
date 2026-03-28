export type AudioStorageMode = 'local' | 'supabase';

export const LOCAL_MAX_AUDIO_FILE_SIZE_BYTES = 700 * 1024;
const SUPABASE_AUDIO_BUCKET = 'card-audio';

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

const sanitizeFileName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const buildAudioPath = (file: File): string => {
  const baseName = sanitizeFileName(file.name.replace(/\.mp3$/i, '')) || 'audio';
  const uniqueId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `cards/${baseName}-${uniqueId}.mp3`;
};

const prepareSupabaseAudio = async (file: File): Promise<string> => {
  const { getSupabaseClient } = await import('./supabase');
  const supabase = await getSupabaseClient();
  const path = buildAudioPath(file);

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_AUDIO_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'audio/mpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload audio to Supabase: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(SUPABASE_AUDIO_BUCKET).getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error('Failed to retrieve a public URL for the uploaded audio.');
  }

  return data.publicUrl;
};

export const prepareAudioForStorage = async (file: File): Promise<string> => {
  validateAudioFile(file);
  const mode = getAudioStorageMode();
  if (mode === 'supabase') {
    return prepareSupabaseAudio(file);
  }
  return prepareLocalAudio(file);
};
