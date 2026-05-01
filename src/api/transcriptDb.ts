const DB_NAME = 'OireachtasTranscripts_v2';
const DB_VERSION = 2;
const STORE_NAME = 'transcripts';
const XML_STORE_NAME = 'xmlDocuments';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => { reject(request.error ?? new Error('IndexedDB operation failed')); };
    request.onsuccess = () => { resolve(request.result); };

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(XML_STORE_NAME)) {
        db.createObjectStore(XML_STORE_NAME);
      }
    };
  });

  return dbPromise;
}

import type { SpeechSegment } from '../types';

export async function saveTranscript(key: string, texts: SpeechSegment[]): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(texts, key);
      req.onsuccess = () => { resolve(); };
      req.onerror = () => { reject(req.error ?? new Error('IndexedDB operation failed')); };
    });
  } catch (e) {
    console.error('Failed to cache transcript to IndexedDB', e);
  }
}

export async function getTranscript(key: string): Promise<SpeechSegment[] | null> {
  try {
    const db = await getDb();
    return await new Promise<SpeechSegment[] | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => { resolve(request.result !== undefined ? (request.result as SpeechSegment[] | null) : null); };
      request.onerror = () => { reject(request.error ?? new Error('IndexedDB operation failed')); };
    });
  } catch (e) {
    console.error('Failed to retrieve cached transcript from IndexedDB', e);
    return null;
  }
}

export async function saveXmlDocument(key: string, xml: string): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(XML_STORE_NAME, 'readwrite');
      const store = tx.objectStore(XML_STORE_NAME);
      const req = store.put(xml, key);
      req.onsuccess = () => { resolve(); };
      req.onerror = () => { reject(req.error ?? new Error('IndexedDB operation failed')); };
    });
  } catch (e) {
    console.error('Failed to cache transcript XML to IndexedDB', e);
  }
}

export async function getXmlDocument(key: string): Promise<string | null> {
  try {
    const db = await getDb();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(XML_STORE_NAME, 'readonly');
      const store = tx.objectStore(XML_STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => { resolve(typeof request.result === 'string' ? request.result : null); };
      request.onerror = () => { reject(request.error ?? new Error('IndexedDB operation failed')); };
    });
  } catch (e) {
    console.error('Failed to retrieve cached transcript XML from IndexedDB', e);
    return null;
  }
}
