import type { SavedItem } from '../utils/savedItems';

const WORKER_API_BASE = (import.meta.env.VITE_TRANSCRIPT_API_BASE as string | undefined)?.replace(/\/+$/, '') ?? '';

export interface PublicResearchCollection {
  slug: string;
  title: string;
  description?: string;
  createdAt: string;
  itemCount: number;
  items: SavedItem[];
}

export interface PublishCollectionInput {
  title: string;
  description?: string;
  items: SavedItem[];
}

export class PublicCollectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicCollectionError';
  }
}

function ensureWorkerBase(): string {
  if (!WORKER_API_BASE) {
    throw new PublicCollectionError('Public collections need a configured Cloudflare Worker URL.');
  }
  return WORKER_API_BASE;
}

async function readError(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    // ignore
  }
  return `Request failed (${response.status}).`;
}

export function isPublicCollectionsEnabled(): boolean {
  return Boolean(WORKER_API_BASE);
}

export async function publishPublicCollection(input: PublishCollectionInput): Promise<PublicResearchCollection> {
  const base = ensureWorkerBase();
  const response = await fetch(`${base}/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new PublicCollectionError(await readError(response));
  }

  return await response.json() as PublicResearchCollection;
}

export async function fetchPublicCollection(slug: string, signal?: AbortSignal): Promise<PublicResearchCollection> {
  const base = ensureWorkerBase();
  const response = await fetch(`${base}/collections/${encodeURIComponent(slug)}`, { signal });

  if (!response.ok) {
    throw new PublicCollectionError(await readError(response));
  }

  return await response.json() as PublicResearchCollection;
}
