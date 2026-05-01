import { saveTranscript, getTranscript, saveXmlDocument, getXmlDocument } from './transcriptDb';
import type { SpeechSegment } from '../types';

const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const DIRECT_FETCH_TIMEOUT_MS = 8000;
const PROXY_FETCH_TIMEOUT_MS = 20000;
const TRANSCRIPT_API_BASE = (import.meta.env.VITE_TRANSCRIPT_API_BASE as string | undefined)?.replace(/\/+$/, '') ?? '';

const xmlRequestCache = new Map<string, Promise<string>>();
const transcriptRequestCache = new Map<string, Promise<SpeechSegment[]>>();

export class TranscriptFetchError extends Error {
  sourceUrl: string;
  constructor(message: string, sourceUrl: string) {
    super(message);
    this.name = 'TranscriptFetchError';
    this.sourceUrl = sourceUrl;
  }
}

function parseAkomaNtosoXml(xmlString: string, debateSectionUri: string, memberUri?: string): SpeechSegment[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  if (doc.querySelector('parsererror')) {
    throw new Error('Failed to parse XML transcript');
  }

  // Pre-map all explicitly declared speakers in the XML document
  const speakerRegistry: Partial<Record<string, { name: string; uri: string | null }>> = {};
  const tlcPersons = doc.getElementsByTagName('*');
  for (const el of tlcPersons) {
    if (el.tagName.includes('TLCPerson')) {
      const eId = el.getAttribute('eId');
      if (eId) {
        speakerRegistry[eId] = {
          name: el.getAttribute('showAs') ?? eId.replace(/_/g, ' '),
          uri: el.getAttribute('href') ? `https://data.oireachtas.ie${el.getAttribute('href')}` : null,
        };
      }
    }
  }

  let internalSpeakerId = '';
  if (memberUri) {
    const memberIdSegment = memberUri.split('/member/')[1];
    if (memberIdSegment) {
      for (const [eId, meta] of Object.entries(speakerRegistry)) {
        if (meta?.uri?.includes(memberIdSegment)) {
          internalSpeakerId = eId;
          break;
        }
      }
    }
  }

  const byRef = internalSpeakerId ? `#${internalSpeakerId}` : null;

  const targetEid = debateSectionUri.split('/').pop();
  let targetSection = null;
  const sections = doc.getElementsByTagName('*');
  for (const el of sections) {
    if (el.tagName.includes('debateSection') && el.getAttribute('eId') === targetEid) {
      targetSection = el;
      break;
    }
  }

  if (!targetSection) return [];

  const speeches = targetSection.getElementsByTagName('*');
  const extractedSegments: SpeechSegment[] = [];

  for (const el of speeches) {
    if (el.tagName.includes('speech')) {
      if (byRef && el.getAttribute('by') !== byRef) continue;

      const rawBy = el.getAttribute('by') ?? '';
      const speakerId = rawBy.replace('#', '');
      const meta = speakerRegistry[speakerId];

      const speakerName = meta ? meta.name : (speakerId.replace(/_/g, ' ') || 'Unknown Speaker');
      const speakerUri = meta ? meta.uri : null;

      const allDescendants = el.getElementsByTagName('*');
      const textBuffer: string[] = [];
      const skipSet = new Set<Element>();

      for (const node of allDescendants) {
        if (skipSet.has(node)) continue;

        if (node.tagName.toLowerCase().includes('table')) {
          // It's a table! Keep its raw HTML and skip its descendants so we don't accidentally pull the `<p>` inside the table cells.
          textBuffer.push(`<div style="overflow-x: auto; margin: 1rem 0;"><table class="oireachtas-table">${node.innerHTML}</table></div>`);

          const tableDescendants = node.getElementsByTagName('*');
          for (const td of tableDescendants) {
            skipSet.add(td);
          }
        } else if (node.tagName.toLowerCase().includes('p')) {
          if (node.textContent.trim()) {
            textBuffer.push(node.innerHTML.trim());
          }
        }
      }

      if (textBuffer.length > 0) {
        // Coalesce consecutive speeches by same speaker
        const lastSegment = extractedSegments.at(-1);
        if (lastSegment?.speakerId === speakerId) {
          lastSegment.paragraphs.push(...textBuffer);
        } else {
          extractedSegments.push({
            speakerId,
            speakerName,
            memberUri: speakerUri,
            paragraphs: textBuffer,
          });
        }
      }
    }
  }

  return extractedSegments;
}

function filterSegmentsByMember(segments: SpeechSegment[], memberUri: string): SpeechSegment[] {
  const memberIdSegment = memberUri.split('/member/')[1];
  if (!memberIdSegment) return [];
  return segments.filter((segment) => segment.memberUri?.includes(memberIdSegment));
}

async function fetchWithTimeout(url: string, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => { timeoutController.abort(); }, timeoutMs);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    return await fetch(url, { signal: combinedSignal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchXmlDocument(xmlUri: string, signal?: AbortSignal): Promise<string> {
  const cached = await getXmlDocument(xmlUri);
  if (cached) return cached;

  const inFlight = xmlRequestCache.get(xmlUri);
  if (inFlight) return inFlight;

  const request = (async () => {
    let lastError: unknown = null;

    const sources = [
      ...(TRANSCRIPT_API_BASE
        ? [{ url: `${TRANSCRIPT_API_BASE}/xml?url=${encodeURIComponent(xmlUri)}`, timeout: PROXY_FETCH_TIMEOUT_MS }]
        : []),
      { url: xmlUri, timeout: DIRECT_FETCH_TIMEOUT_MS },
      { url: `${PROXY_URL}${encodeURIComponent(xmlUri)}`, timeout: PROXY_FETCH_TIMEOUT_MS },
    ];

    for (const source of sources) {
      try {
        const response = await fetchWithTimeout(source.url, source.timeout, signal);
        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }
        const xml = await response.text();
        saveXmlDocument(xmlUri, xml).catch(console.error);
        return xml;
      } catch (err) {
        if (signal?.aborted) throw err;
        lastError = err;
      }
    }

    throw new TranscriptFetchError(
      lastError instanceof Error
        ? `Unable to load transcript (${lastError.message}). View the official record on Oireachtas.ie.`
        : 'Unable to reach transcript service. View the official record on Oireachtas.ie.',
      xmlUri
    );
  })();

  xmlRequestCache.set(xmlUri, request);
  void request.then(
    () => { xmlRequestCache.delete(xmlUri); },
    () => { xmlRequestCache.delete(xmlUri); }
  );
  return request;
}

export async function fetchDebateTranscript(
  xmlUri: string,
  debateSectionUri: string,
  memberUri?: string,
  signal?: AbortSignal
): Promise<SpeechSegment[]> {
  const cacheKey = `${debateSectionUri}::${memberUri ?? 'ALL'}`;

  // Avoid network totally if indexed exactly for this URL/Member combo!
  const cached = await getTranscript(cacheKey);
  if (cached) return cached;

  if (memberUri) {
    const allCached = await getTranscript(`${debateSectionUri}::ALL`);
    if (allCached) {
      const filtered = filterSegmentsByMember(allCached, memberUri);
      saveTranscript(cacheKey, filtered).catch(console.error);
      return filtered;
    }
  }

  const inFlight = transcriptRequestCache.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async () => {
    const xmlString = await fetchXmlDocument(xmlUri, signal);
    const allTranscript = parseAkomaNtosoXml(xmlString, debateSectionUri);
    saveTranscript(`${debateSectionUri}::ALL`, allTranscript).catch(console.error);

    if (memberUri) {
      return filterSegmentsByMember(allTranscript, memberUri);
    }
    return allTranscript;
  })();

  transcriptRequestCache.set(cacheKey, request);
  void request.then(
    () => { transcriptRequestCache.delete(cacheKey); },
    () => { transcriptRequestCache.delete(cacheKey); }
  );
  const transcript = await request;

  // Fire and forget caching logic
  saveTranscript(cacheKey, transcript).catch(console.error);

  return transcript;
}
