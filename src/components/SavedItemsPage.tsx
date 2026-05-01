import { AlertCircle, Bookmark, Clipboard, Download, Link as LinkIcon, RadioTower, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { isPublicCollectionsEnabled, publishPublicCollection, type PublicResearchCollection } from '../api/publicCollections';
import { useSavedItems } from '../hooks/useSavedItems';
import { copyShareUrl, copyText } from '../utils/clipboard';
import { formatDateShort } from '../utils/format';
import { viewToHash } from '../utils/routing';
import type { SavedItem } from '../utils/savedItems';

interface SavedItemsPageProps {
  onBack: () => void;
}

function typeLabel(type: string): string {
  if (type === 'speech') return 'Transcript passage';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function absoluteUrl(item: SavedItem): string {
  return `${window.location.origin}${window.location.pathname}${item.urlHash}`;
}

function markdownEscape(text: string): string {
  return text.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function buildResearchDossier(items: SavedItem[]): string {
  const generated = new Date().toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' });
  const lines = [
    '# Oireachtas Explorer Research Dossier',
    '',
    `Generated: ${generated}`,
    '',
  ];

  for (const item of items) {
    lines.push(`## ${markdownEscape(item.title)}`);
    lines.push('');
    lines.push(`- Type: ${typeLabel(item.type)}`);
    lines.push(`- Saved: ${formatDateShort(item.savedAt)}`);
    if (item.sourceDate) lines.push(`- Source date: ${formatDateShort(item.sourceDate)}`);
    if (item.subtitle) lines.push(`- Context: ${item.subtitle}`);
    lines.push(`- Link: ${absoluteUrl(item)}`);
    if (item.citation) lines.push(`- Citation: ${item.citation}`);
    if (item.quote) {
      lines.push('');
      lines.push('> ' + item.quote.replace(/\n+/g, '\n> '));
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function SavedItemsPage({ onBack }: SavedItemsPageProps) {
  const { items, remove } = useSavedItems();
  const [copied, setCopied] = useState(false);
  const [publishTitle, setPublishTitle] = useState('Research collection');
  const [publishDescription, setPublishDescription] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState<PublicResearchCollection | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyDossier = () => {
    copyText(buildResearchDossier(items)).then(() => {
      setCopied(true);
      window.setTimeout(() => { setCopied(false); }, 1800);
    }).catch(() => { setCopied(false); });
  };

  const handleDownloadDossier = () => {
    const blob = new Blob([buildResearchDossier(items)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'oireachtas-research-dossier.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    setPublished(null);

    try {
      const collection = await publishPublicCollection({
        title: publishTitle,
        description: publishDescription,
        items,
      });
      setPublished(collection);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Unable to publish this collection.');
    } finally {
      setPublishing(false);
    }
  };

  const publicHash = published
    ? viewToHash(
      { kind: 'collection', slug: published.slug },
      published.items[0]?.chamber ?? 'dail',
      published.items[0]?.houseNo ?? 34
    )
    : '';
  const publicLink = published ? `${window.location.origin}${window.location.pathname}${publicHash}` : '';

  const handleCopyPublicLink = () => {
    if (!publicLink) return;
    copyShareUrl(publicLink).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => { setLinkCopied(false); }, 1800);
    }).catch(() => { setLinkCopied(false); });
  };

  return (
    <div className="container">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="member-grid-page__header">
        <h1 className="section-heading">Saved Items</h1>
        <p className="section-subheading">A private browser-local reading list for records you want to revisit.</p>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <Bookmark className="empty-state__icon" size={40} aria-hidden="true" />
          <p>No saved items yet. Use Save on members, debates, speeches, and bills.</p>
        </div>
      ) : (
        <>
          <div className="saved-toolbar">
            <button type="button" onClick={handleCopyDossier}>
              <Clipboard size={16} aria-hidden="true" />
              {copied ? 'Copied dossier' : 'Copy dossier'}
            </button>
            <button type="button" onClick={handleDownloadDossier}>
              <Download size={16} aria-hidden="true" />
              Download Markdown
            </button>
          </div>
          <div className="publish-panel">
            <div className="publish-panel__header">
              <div>
                <h2>Publish a public collection</h2>
                <p>Share this dossier as a read-only public link backed by Cloudflare Workers KV.</p>
              </div>
              <span className="type-badge">{items.length} items</span>
            </div>

            {isPublicCollectionsEnabled() ? (
              <>
                <div className="publish-panel__form">
                  <label className="field-label">
                    Collection title
                    <input
                      type="text"
                      value={publishTitle}
                      onChange={(e) => { setPublishTitle(e.target.value); }}
                      maxLength={120}
                      placeholder="Election coverage dossier"
                    />
                  </label>
                  <label className="field-label">
                    Description
                    <textarea
                      value={publishDescription}
                      onChange={(e) => { setPublishDescription(e.target.value); }}
                      maxLength={400}
                      rows={3}
                      placeholder="Why these records matter, the angle you are tracking, or the historical thread you are documenting."
                    />
                  </label>
                </div>
                <div className="saved-toolbar">
                  <button type="button" onClick={() => { void handlePublish(); }} disabled={publishing || items.length === 0 || !publishTitle.trim()}>
                    <RadioTower size={16} aria-hidden="true" />
                    {publishing ? 'Publishing…' : 'Publish collection'}
                  </button>
                  {published && (
                    <button type="button" onClick={handleCopyPublicLink}>
                      <LinkIcon size={16} aria-hidden="true" />
                      {linkCopied ? 'Copied link' : 'Copy short link'}
                    </button>
                  )}
                </div>
                {publishError && <div className="error-banner">{publishError}</div>}
                {published && (
                  <div className="publish-panel__success">
                    <div className="publish-panel__success-meta">
                      <span className="type-badge">Published</span>
                      <span>{formatDateShort(published.createdAt)}</span>
                    </div>
                    <a className="saved-card__title" href={publicHash}>
                      {published.title}
                    </a>
                    <div className="saved-card__citation">{publicLink}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="publish-panel__notice">
                <AlertCircle size={16} aria-hidden="true" />
                This build does not have a Cloudflare Worker URL configured, so publishing is currently unavailable.
              </div>
            )}
          </div>
          <div className="saved-list">
            {items.map((item) => (
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
                </div>
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => { remove(item.id); }}
                  aria-label={`Remove ${item.title}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
