# iOS Saved Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the iOS saved placeholder with local saved-item persistence, a native saved list, removal, dossier copy, and first save buttons on member and bill detail screens.

**Architecture:** Reuse the `SavedResearchItem` shape already added for public collections, add a small `SavedResearchStore` backed by `UserDefaults`, and surface it through SwiftUI view models. Use the existing route hash parser to navigate saved rows back into native routes.

**Tech Stack:** SwiftUI, Codable, UserDefaults, UIPasteboard, existing `AppRoute` navigation and design system.

---

### Task 1: Saved Store

**Files:**
- Modify: `ios/OireachtasExplorer/Models/Models.swift`

- [ ] Add `SavedResearchStore` with `load`, `isSaved`, `toggle`, `remove`, and `buildDossier`.
- [ ] Persist `[SavedResearchItem]` as JSON in `UserDefaults` using key `oireachtas-explorer:saved-items`.
- [ ] Sort loaded items by `savedAt` descending.

### Task 2: Saved Screen

**Files:**
- Modify: `ios/OireachtasExplorer/ContentView.swift`

- [ ] Replace `SavedItemsMigrationScreen` with `SavedItemsScreen`.
- [ ] Add a model that loads from `SavedResearchStore`, removes items, and copies a dossier via `UIPasteboard`.
- [ ] Render empty state, toolbar, item rows, citations, quotes, and remove buttons.
- [ ] Reuse `parsePublicCollectionHash` for native route navigation.

### Task 3: Save Buttons

**Files:**
- Modify: `ios/OireachtasExplorer/ContentView.swift`
- Modify: `ios/OireachtasExplorer/Views/MemberProfileView.swift`

- [ ] Add reusable `SaveResearchButton`.
- [ ] Add a save button to `BillHeroCard`.
- [ ] Add a save button to member profiles.
- [ ] Generate saved item ids and `urlHash` values matching web route shapes.

### Task 4: Verify

**Files:**
- Validate: iOS Swift sources and Xcode project

- [ ] Run Swift typecheck.
- [ ] Run full iOS build using the project scheme.
- [ ] Confirm saved routes no longer point at the migration placeholder.
