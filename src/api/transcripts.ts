import { saveTranscript, getTranscript } from './transcriptDb';
import type { SpeechSegment } from '../types';

const PROXY_URL = 'https://corsproxy.io/?';

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

  const proxyUrl = `${PROXY_URL}${encodeURIComponent(xmlUri)}`;
  const response = await fetch(proxyUrl, { signal });

  if (!response.ok) {
     throw new Error(`Failed to fetch transcript: ${response.statusText}`);
  }

  const xmlString = await response.text();
  const transcript = parseAkomaNtosoXml(xmlString, debateSectionUri, memberUri);

  // Fire and forget caching logic
  saveTranscript(cacheKey, transcript).catch(console.error);

  return transcript;
}
