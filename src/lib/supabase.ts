const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

type StorageUploadResult = { error: { message: string } | null };
type StoragePublicUrlResult = { data: { publicUrl?: string } };

type SupabaseStorageBucket = {
  upload: (
    path: string,
    file: File,
    options: { cacheControl: string; contentType: string; upsert: boolean },
  ) => Promise<StorageUploadResult>;
  getPublicUrl: (path: string) => StoragePublicUrlResult;
};

type SupabaseClient = {
  storage: {
    from: (bucket: string) => SupabaseStorageBucket;
  };
};

let cachedClient: SupabaseClient | null = null;

export const getSupabaseClient = async (): Promise<SupabaseClient> => {
  if (cachedClient) {
    return cachedClient;
  }

  const moduleName = '@supabase/supabase-js';
  const { createClient } = await import(/* @vite-ignore */ moduleName);
  cachedClient = createClient(supabaseUrl, supabaseAnonKey) as SupabaseClient;
  return cachedClient;
};
