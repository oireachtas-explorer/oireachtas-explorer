import { createShortLink } from '../api/shortlinks';

function copyViaExecCommand(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    copyViaExecCommand(text);
  }
}

export async function resolveShareUrl(url: string): Promise<string> {
  try {
    const shortLink = await createShortLink(url);
    return shortLink.shortUrl;
  } catch {
    return url;
  }
}

export async function copyShareUrl(url: string): Promise<string> {
  const resolved = await resolveShareUrl(url);
  await copyText(resolved);
  return resolved;
}
