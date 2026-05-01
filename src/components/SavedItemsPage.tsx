import { Bookmark, Clipboard, Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSavedItems } from '../hooks/useSavedItems';
import { copyText } from '../utils/clipboard';
import { formatDateShort } from '../utils/format';
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
