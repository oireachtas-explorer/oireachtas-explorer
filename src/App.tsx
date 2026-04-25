import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './App.css';
import type { Chamber, View, Constituency, Member } from './types';
import { LogoSVG } from './components/Logo';
import { fetchConstituencies, fetchAllMembers } from './api/oireachtas';
import { houseList, LATEST_DAIL, LATEST_SEANAD, chamberName, memberNoun } from './utils/dail';
import { MemberGrid } from './components/MemberGrid';
import { MemberCard } from './components/MemberCard';
import { MemberProfile } from './components/MemberProfile';
import { GlobalDebatesList } from './components/GlobalDebatesList';
import { DebateViewerPage } from './components/DebateViewerPage';
import { BillViewerPage } from './components/BillViewerPage';
import { AttributionFooter } from './components/AttributionFooter';
import { CommitteePage } from './components/CommitteePage';
import { OfficesPage } from './components/OfficesPage';
import { PartyBreakdown } from './components/PartyBreakdown';
import { viewToHash, parseHash } from './utils/routing';

function latestForChamber(c: Chamber): number {
  return c === 'seanad' ? LATEST_SEANAD : LATEST_DAIL;
}

// Header search bar component
function HeaderSearch({ constituencies, onSelect }: { constituencies: Constituency[]; onSelect: (code: string, name: string) => void }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return constituencies.filter(c => c.name.toLowerCase().includes(t)).slice(0, 8);
  }, [q, constituencies]);

  function pick(c: Constituency) {
    setQ('');
    onSelect(c.code, c.name);
  }

  return (
    <div className="app-header__search">
      <svg className="app-header__search-icon" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        ref={ref}
        type="text"
        value={q}
        placeholder="Search constituency…"
        onChange={(e) => { setQ(e.target.value); setIdx(0); }}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
          else if (e.key === 'Enter' && filtered[idx]) { pick(filtered[idx]); }
          else if (e.key === 'Escape') { setQ(''); }
        }}
      />
      {q && filtered.length > 0 && (
        <div className="app-header__search-dropdown">
          {filtered.map((c, i) => (
            <button key={c.code}
              className={`app-header__search-item${i === idx ? ' app-header__search-item--active' : ''}`}
              onMouseEnter={() => { setIdx(i); }}
              onClick={() => { pick(c); }}>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Hero search on home page
function HeroSearch({ constituencies, onSelect }: { constituencies: Constituency[]; onSelect: (code: string, name: string) => void }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return constituencies.slice(0, 10);
    return constituencies.filter(c => c.name.toLowerCase().includes(t));
  }, [q, constituencies]);

  function pick(c: Constituency) { setQ(''); onSelect(c.code, c.name); }

  return (
    <div className="hero-search">
      <svg className="hero-search-icon" width="20" height="20" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input type="text" value={q} placeholder="Search your constituency…"
        onChange={(e) => { setQ(e.target.value); setIdx(0); }}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
          else if (e.key === 'Enter' && filtered[idx]) { pick(filtered[idx]); }
          else if (e.key === 'Escape') { setQ(''); }
        }}
      />
      {q.length > 0 && filtered.length > 0 && (
        <div className="hero-search-dropdown">
          {filtered.map((c, i) => (
            <button key={c.code}
              className={`hero-search-item${i === idx ? ' hero-search-item--active' : ''}`}
              onMouseEnter={() => { setIdx(i); }}
              onClick={() => { pick(c); }}>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const initial = parseHash(window.location.hash);
  const [view, setView] = useState<View>(initial.view);
  const [chamber, setChamber] = useState<Chamber>(initial.chamber);
  const [houseNo, setHouseNo] = useState(initial.houseNo);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [, setLoadingConstituencies] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [constituenciesError, setConstituenciesError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingConstituencies(true);
    setLoadingMembers(true);
    setConstituenciesError(null);
    fetchConstituencies(chamber, houseNo)
      .then(setConstituencies)
      .catch((err: unknown) => {
        setConstituenciesError(err instanceof Error ? err.message : 'Failed to load constituencies');
        setConstituencies([]);
      })
      .finally(() => { setLoadingConstituencies(false); });
    fetchAllMembers(chamber, houseNo)
      .then(setAllMembers)
      .catch(() => { setAllMembers([]); })
      .finally(() => { setLoadingMembers(false); });
  }, [chamber, houseNo]);

  useEffect(() => {
    function onHashChange() {
      const parsed = parseHash(window.location.hash);
      setView(parsed.view);
      setChamber(parsed.chamber);
      setHouseNo(parsed.houseNo);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => { window.removeEventListener('hashchange', onHashChange); };
  }, []);

  const navigate = useCallback((newView: View, newHouseNo?: number, newChamber?: Chamber) => {
    const c = newChamber ?? chamber;
    const h = newHouseNo ?? houseNo;
    setView(newView);
    if (newChamber !== undefined) setChamber(newChamber);
    if (newHouseNo !== undefined) setHouseNo(newHouseNo);
    window.location.hash = viewToHash(newView, c, h);
  }, [chamber, houseNo]);

  const handleSelectConstituency = useCallback((code: string, name: string) => {
    navigate({ kind: 'members', constituencyCode: code, constituencyName: name });
  }, [navigate]);

  const handleSelectMember = useCallback(
    (memberUri: string, memberName: string, constituencyCode: string, constituencyName: string) => {
      navigate({ kind: 'member', memberUri, memberName, constituencyCode, constituencyName });
    }, [navigate]);

  const handleBack = useCallback(() => { window.history.back(); }, []);
  const handleGoHome = useCallback(() => { navigate({ kind: 'home' }); }, [navigate]);
  const handleHouseChange = useCallback((newHouseNo: number) => { navigate({ kind: 'home' }, newHouseNo); }, [navigate]);
  const handleChamberToggle = useCallback((newChamber: Chamber) => {
    if (newChamber === chamber) return;
    navigate({ kind: 'home' }, latestForChamber(newChamber), newChamber);
  }, [chamber, navigate]);

  // Stats derived from loaded data
  const totalMembers = allMembers.length || (chamber === 'dail' ? 160 : 60);
  const totalConstituencies = constituencies.length || (chamber === 'dail' ? 43 : 11);
  const label = chamberName(chamber);
  const latest = latestForChamber(chamber);
  const currentList = houseList(chamber);

  function renderView() {
    if (constituenciesError && view.kind === 'home') {
      return (
        <div className="container">
          <div className="error-banner">Failed to load {chamber === 'seanad' ? 'panels' : 'constituencies'}: {constituenciesError}</div>
        </div>
      );
    }

    switch (view.kind) {
      case 'home':
        return (
          <div className="page">
            {/* Hero */}
            <div className="hero">
              <div className="hero-inner">
                <div className="hero-eyebrow">{label} Éireann · {houseNo}{houseNo === latest ? ' (Current)' : ''} {label}</div>
                <h1>Ireland's Parliament,<br /><em>Open to All.</em></h1>
                <p className="hero-sub">
                  Explore {memberNoun(chamber, true)} — their voting records, speeches, debates and bills.
                  Every voice in Leinster House, searchable.
                </p>
                <HeroSearch constituencies={constituencies} onSelect={handleSelectConstituency} />
                <button className="hero-link" onClick={() => { navigate({ kind: 'global-debates', houseNo }); }}>
                  Browse all {label} debates
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="stats-bar">
              {[
                [String(totalMembers), memberNoun(chamber, true)],
                [String(totalConstituencies), chamber === 'seanad' ? 'Panels' : 'Constituencies'],
                [`${houseNo}${houseNo === latest ? ' (Current)' : ''}`, label],
              ].map(([n, l]) => (
                <div key={l} className="stat-item">
                  <span className="stat-num">{n}</span>
                  <span className="stat-lbl">{l}</span>
                </div>
              ))}
            </div>

            {/* Body */}
            <div className="home-body">
              {/* Party composition */}
              <div>
                <div className="section-hd">
                  <div>
                    <div className="section-title">{label} Composition</div>
                    <div className="section-sub">{memberNoun(chamber, true)} by party</div>
                  </div>
                </div>
                <div className="hemi-section">
                  <PartyBreakdown
                    members={allMembers}
                    loading={loadingMembers}
                    chamber={chamber}
                    houseNo={houseNo}
                  />
                </div>
              </div>

              {/* Debates CTA */}
              <div style={{ marginTop: 48 }}>
                <div className="section-hd">
                  <div className="section-title">{label} Debates</div>
                  <button className="section-link" onClick={() => { navigate({ kind: 'global-debates', houseNo }); }}>
                    View all →
                  </button>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '24px', boxShadow: 'var(--sh-sm)' }}>
                  <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 20 }}>
                    Read official transcripts from recent plenary and committee debates — speeches, votes and proceedings.
                  </p>
                  <button className="bill-pdf-btn" style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => { navigate({ kind: 'global-debates', houseNo }); }}>
                    Browse All Debates
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'members':
        return (
          <MemberGrid
            constituencyCode={view.constituencyCode}
            constituencyName={view.constituencyName}
            chamber={chamber}
            houseNo={houseNo}
            allMembers={allMembers}
            loadingAllMembers={loadingMembers}
            onSelectMember={handleSelectMember}
            onBack={handleBack}
          />
        );

      case 'member':
        return (
          <MemberProfile
            memberUri={view.memberUri}
            constituencyName={view.constituencyName}
            chamber={chamber}
            houseNo={houseNo}
            onBack={handleBack}
            onNavigate={navigate}
          />
        );

      case 'offices':
        return (
          <OfficesPage
            chamber={chamber}
            houseNo={houseNo}
            allMembers={allMembers}
            loadingAllMembers={loadingMembers}
            onSelectMember={handleSelectMember}
            onBack={handleBack}
          />
        );

      case 'committee':
        return (
          <CommitteePage
            committeeUri={view.committeeUri}
            committeeName={view.committeeName}
            chamber={chamber}
            houseNo={houseNo}
            allMembers={allMembers}
            loadingAllMembers={loadingMembers}
            onSelectMember={handleSelectMember}
            onBack={handleBack}
          />
        );

      case 'global-debates':
        return (
          <div className="container">
            <button className="back-btn" onClick={handleBack}>← Back</button>
            <h1 className="section-heading section-heading--tight">All {label} Debates</h1>
            <p className="section-subheading section-subheading--spaced">Chronological official records of legislative proceedings.</p>
            <GlobalDebatesList
              chamber={chamber}
              houseNo={houseNo}
              onNavigateToDebate={navigate}
            />
          </div>
        );

      case 'party':
        return (
          <div className="container">
            <div className="members-header">
              <button className="back-btn" style={{ marginBottom: 0 }} onClick={handleBack}>← Back</button>
              <h1 style={{ fontFamily: 'var(--ff)', fontSize: 28, color: 'var(--text)' }}>{view.partyName} {memberNoun(chamber, true)}</h1>
            </div>
            <div className="member-grid" style={{ padding: 0, marginTop: 24 }}>
              {allMembers.filter(m => m.party === view.partyName).map(m => (
                <MemberCard
                  key={m.memberCode}
                  member={m}
                  onClick={() => { handleSelectMember(m.uri, m.fullName, m.constituencyCode, m.constituency); }}
                />
              ))}
            </div>
          </div>
        );

      case 'debate-viewer':
        return (
          <DebateViewerPage
            xmlUri={view.xmlUri}
            debateSectionUri={view.debateSectionUri}
            title={view.title}
            focusMemberUri={view.focusMemberUri}
            chamber={chamber}
            houseNo={houseNo}
            onBack={handleBack}
          />
        );

      case 'bill-viewer':
        return (
          <BillViewerPage
            billNo={view.billNo}
            billYear={view.billYear}
            onBack={handleBack}
          />
        );
    }
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="app-header">
        <button className="app-header__home" onClick={handleGoHome} aria-label="Go to home page">
          <LogoSVG size={28} className="color-accent" />
          <span className="app-header__title">Oireachtas Explorer</span>
        </button>

        <HeaderSearch constituencies={constituencies} onSelect={handleSelectConstituency} />

        <div className="app-header__subtitle-container">
          <div className="chamber-toggle" role="group" aria-label="Select chamber">
            {(['dail', 'seanad'] as Chamber[]).map((c) => (
              <button key={c} type="button"
                className={`chamber-toggle__btn${c === chamber ? ' chamber-toggle__btn--active' : ''}`}
                onClick={() => { handleChamberToggle(c); }}
                aria-pressed={c === chamber}>
                {chamberName(c)}
              </button>
            ))}
          </div>
          <select className="app-header__subtitle" value={houseNo}
            onChange={(e) => { handleHouseChange(parseInt(e.target.value, 10)); }}
            aria-label={`Select ${chamberName(chamber)} session`}>
            {currentList.map((d) => (
              <option key={d.houseNo} value={d.houseNo}>
                {d.houseNo}{d.houseNo === latest ? ' (Current)' : ''} {chamberName(chamber)}
              </option>
            ))}
          </select>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>{renderView()}</main>
      <AttributionFooter />
    </div>
  );
}
