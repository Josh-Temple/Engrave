export interface PrecacheEntry {
  path: string;
  content: string | Uint8Array;
}

export function fingerprintPrecache(entries: PrecacheEntry[]): string;
export function generateServiceWorker(distDirectory?: string): Promise<{
  fingerprint: string;
  files: string[];
  source: string;
}>;
