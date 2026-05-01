import { useEffect, useState } from 'react';
import { copyShareUrl, resolveShareUrl } from '../utils/clipboard';
import { isShortLinksEnabled } from '../api/shortlinks';

interface ShareModalProps {
  url: string;
  onClose: () => void;
}

export function ShareModal({ url, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [displayUrl, setDisplayUrl] = useState(url);
  const shortLinksEnabled = isShortLinksEnabled();
  const [loadingShortLink, setLoadingShortLink] = useState(shortLinksEnabled);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => { window.removeEventListener('keydown', h); };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setDisplayUrl(url);

    if (!shortLinksEnabled) {
      setLoadingShortLink(false);
      return () => { cancelled = true; };
    }

    setLoadingShortLink(true);
    void resolveShareUrl(url)
      .then((resolvedUrl) => {
        if (!cancelled) setDisplayUrl(resolvedUrl);
      })
      .finally(() => {
        if (!cancelled) setLoadingShortLink(false);
      });

    return () => { cancelled = true; };
  }, [url, shortLinksEnabled]);

  const handleCopy = () => {
    const finish = () => {
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 2000);
    };
    copyShareUrl(url).then((resolvedUrl) => {
      setDisplayUrl(resolvedUrl);
      finish();
    }).catch(finish);
  };

  return (
    <div className="pdf-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="share-modal">
        <div className="share-modal__hdr">
          <span className="share-modal__title">Share link</span>
          <button className="pdf-modal-close" onClick={onClose} aria-label="Close share dialog">×</button>
        </div>
        <input
          className="share-modal__url"
          readOnly
          value={displayUrl}
          onFocus={(e) => { e.currentTarget.select(); }}
        />
        {loadingShortLink && (
          <div className="share-modal__status">Generating short link…</div>
        )}
        <div className="share-modal__actions">
          <button className="share-modal__copy-btn" onClick={handleCopy}>
            {copied ? 'Copied!' : shortLinksEnabled ? 'Copy short link' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
