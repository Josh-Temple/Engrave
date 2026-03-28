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

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const encodePath = (path: string): string =>
  path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const createStorageBucketClient = (bucket: string): SupabaseStorageBucket => ({
  upload: async (path, file, options) => {
    const safePath = encodePath(path);
    const endpoint = `${trimTrailingSlash(supabaseUrl)}/storage/v1/object/${bucket}/${safePath}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'x-upsert': options.upsert ? 'true' : 'false',
        'cache-control': options.cacheControl,
        'content-type': options.contentType || 'audio/mpeg',
      },
      body: file,
    });

    if (response.ok) {
      return { error: null };
    }

    let message = `HTTP ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string; error?: string };
      message = data.message || data.error || message;
    } catch {
      // Keep HTTP fallback message when response body is not JSON.
    }

    return { error: { message } };
  },
  getPublicUrl: (path) => {
    const safePath = encodePath(path);
    const publicUrl = `${trimTrailingSlash(supabaseUrl)}/storage/v1/object/public/${bucket}/${safePath}`;
    return { data: { publicUrl } };
  },
});

let cachedClient: SupabaseClient | null = null;

export const getSupabaseClient = async (): Promise<SupabaseClient> => {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = {
    storage: {
      from: (bucket: string) => createStorageBucketClient(bucket),
    },
  };

  return cachedClient;
};
