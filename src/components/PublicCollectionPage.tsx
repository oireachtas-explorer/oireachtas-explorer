import { AlertCircle, BookOpenText, Clipboard, Download, Link as LinkIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchPublicCollection, isPublicCollectionsEnabled, type PublicResearchCollection } from '../api/publicCollections';
import { copyShareUrl, copyText, resolveShareUrl } from '../utils/clipboard';
import { formatDateShort } from '../utils/format';

interface PublicCollectionPageProps {
  slug: string;
  onBack: () => void;
}

function markdownEscape(text: string): string {
  return text.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function absoluteUrl(hash: string): string {
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

function typeLabel(type: string): string {
  if (type === 'speech') return 'Transcript passage';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function buildPublicDossier(collection: PublicResearchCollection): string {
  const lines = [
    `# ${collection.title}`,
    '',
    `Published: ${formatDateShort(collection.createdAt)}`,
    `Items: ${collection.itemCount}`,
  ];

  if (collection.description) {
    lines.push('', collection.description);
  }

  for (const item of collection.items) {
    lines.push('', `## ${markdownEscape(item.title)}`, '');
    lines.push(`- Type: ${typeLabel(item.type)}`);
    lines.push(`- Saved: ${formatDateShort(item.savedAt)}`);
    if (item.sourceDate) lines.push(`- Source date: ${formatDateShort(item.sourceDate)}`);
    if (item.subtitle) lines.push(`- Context: ${item.subtitle}`);
    lines.push(`- Link: ${absoluteUrl(item.urlHash)}`);
    if (item.citation) lines.push(`- Citation: ${item.citation}`);
    if (item.quote) {
      lines.push('', '> ' + item.quote.replace(/\n+/g, '\n> '));
    }
  }

  return lines.join('\n');
}

export function PublicCollectionPage({ slug, onBack }: PublicCollectionPageProps) {
  const [collection, setCollection] = useState<PublicResearchCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setCollection(null);

    fetchPublicCollection(slug, controller.signal)
      .then(setCollection)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load this public collection.');
      })
      .finally(() => { setLoading(false); });

    return () => { controller.abort(); };
  }, [slug]);

  const canonicalShareUrl = useMemo(() => window.location.href, []);

  useEffect(() => {
    let cancelled = false;
    resolveShareUrl(canonicalShareUrl)
      .then((resolved) => {
        if (!cancelled) setShareUrl(resolved);
      })
      .catch(() => {
        if (!cancelled) setShareUrl(canonicalShareUrl);
      });

    return () => { cancelled = true; };
  }, [canonicalShareUrl]);

  const handleCopyDossier = () => {
    if (!collection) return;
    copyText(buildPublicDossier(collection)).then(() => {
      setCopied(true);
      window.setTimeout(() => { setCopied(false); }, 1800);
    }).catch(() => { setCopied(false); });
  };

  const handleCopyLink = () => {
    copyShareUrl(canonicalShareUrl).then((resolved) => {
      setShareUrl(resolved);
      setLinkCopied(true);
      window.setTimeout(() => { setLinkCopied(false); }, 1800);
    }).catch(() => { setLinkCopied(false); });
  };

  const handleDownload = () => {
    if (!collection) return;
    const blob = new Blob([buildPublicDossier(collection)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="member-grid-page__header">
        <h1 className="section-heading">Public Research Collection</h1>
        <p className="section-subheading">A shareable dossier of curated Oireachtas records for newsroom and research workflows.</p>
      </div>

      {!isPublicCollectionsEnabled() ? (
        <div className="empty-state">
          <AlertCircle className="empty-state__icon" size={40} aria-hidden="true" />
          <p>This build does not have a Cloudflare Worker configured for public collections.</p>
        </div>
      ) : loading ? (
        <div className="loading-state"><span className="spinner" /> Loading collection…</div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : collection ? (
        <>
          <div className="collection-hero">
            <div className="collection-hero__meta">
              <span className="type-badge">Published collection</span>
              <span>{formatDateShort(collection.createdAt)}</span>
              <span>{collection.itemCount} items</span>
            </div>
            <h2 className="collection-hero__title">{collection.title}</h2>
            {collection.description && <p className="collection-hero__description">{collection.description}</p>}
            <div className="saved-toolbar">
              <button type="button" onClick={handleCopyLink}>
                <LinkIcon size={16} aria-hidden="true" />
                {linkCopied ? 'Copied link' : 'Copy short link'}
              </button>
              <button type="button" onClick={handleCopyDossier}>
                <Clipboard size={16} aria-hidden="true" />
                {copied ? 'Copied dossier' : 'Copy dossier'}
              </button>
              <button type="button" onClick={handleDownload}>
                <Download size={16} aria-hidden="true" />
                Download Markdown
              </button>
            {shareUrl && <div className="saved-card__citation">{shareUrl}</div>}
            </div>
          </div>

          <div className="saved-list">
            {collection.items.map((item) => (
              <div key={item.id} className="saved-card">
                <div className="saved-card__body">
                  <div className="saved-card__meta">
                    <span className="type-badge">{typeLabel(item.type)}</span>
                    <span>{formatDateShort(item.savedAt)}</span>
                    {item.sourceDate && <span>{formatDateShort(item.sourceDate)}</span>}
                  </div>
                  <a className="saved-card__title" href={item.urlHash}>{item.title}</a>
                  {item.subtitle && <div className="saved-card__subtitle">{item.subtitle}</div>}
                  {item.citation && <div className="saved-card__citation">{item.citation}</div>}
                  {item.quote && (
                    <blockquote className="saved-card__quote">
                      {item.quote}
                    </blockquote>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <BookOpenText className="empty-state__icon" size={40} aria-hidden="true" />
          <p>Nothing to show for this collection yet.</p>
        </div>
      )}
    </div>
  );
}
