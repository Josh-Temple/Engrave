export type AudioStorageMode = 'local' | 'supabase';

export const LOCAL_MAX_AUDIO_FILE_SIZE_BYTES = 700 * 1024;
const SUPABASE_AUDIO_BUCKET = 'card-audio';
const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav'] as const;
const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
]);

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
  const extension = file.name.split('.').pop()?.toLowerCase();
  const isSupportedExtension = extension
    ? SUPPORTED_AUDIO_EXTENSIONS.includes(
        extension as (typeof SUPPORTED_AUDIO_EXTENSIONS)[number],
      )
    : false;
  const isSupportedMimeType = SUPPORTED_AUDIO_MIME_TYPES.has(
    file.type.toLowerCase(),
  );
  if (!isSupportedExtension && !isSupportedMimeType) {
    throw new Error('Only MP3 or WAV files are supported.');
  }
};

const prepareLocalAudio = async (file: File): Promise<string> => {
  if (file.size > LOCAL_MAX_AUDIO_FILE_SIZE_BYTES) {
    throw new Error(
      'Audio file is too large for reliable local storage. Please use an MP3/WAV file smaller than 700KB.',
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

const getExtension = (file: File): 'mp3' | 'wav' => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === 'wav' ? 'wav' : 'mp3';
};

const buildAudioPath = (file: File): string => {
  const extension = getExtension(file);
  const baseName =
    sanitizeFileName(file.name.replace(/\.(mp3|wav)$/i, '')) || 'audio';
  const uniqueId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `cards/${baseName}-${uniqueId}.${extension}`;
};

const prepareSupabaseAudio = async (file: File): Promise<string> => {
  const { getSupabaseClient } = await import('./supabase');
  const supabase = await getSupabaseClient();
  const path = buildAudioPath(file);

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_AUDIO_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || (getExtension(file) === 'wav' ? 'audio/wav' : 'audio/mpeg'),
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
