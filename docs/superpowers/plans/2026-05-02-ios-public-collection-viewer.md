# iOS Public Collection Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the iOS public collection placeholder with a read-only native viewer for shared research collections.

**Architecture:** Add Codable public collection and saved-item models that match the Worker JSON contract, add a small `PublicCollectionsAPI` actor that reads an optional Worker base URL from Info.plist, and route `AppRoute.publicCollection` to a SwiftUI collection screen. Keep publishing, local saved persistence, and markdown export out of scope for this pass.

**Tech Stack:** SwiftUI, async/await, URLSession, existing `AppRoute` navigation, existing design system.

---

### Task 1: Public Collection Models and API

**Files:**
- Modify: `ios/OireachtasExplorer/Models/Models.swift`
- Modify: `ios/OireachtasExplorer/API/OireachtasAPI.swift`
- Modify: `ios/OireachtasExplorer/Info.plist`

- [ ] Add `SavedResearchItem`, `SavedResearchItemType`, and `PublicResearchCollection` models matching the web Worker response.
- [ ] Add `PublicCollectionsAPI` actor with `isConfigured`, `fetchCollection(slug:)`, and Worker-base URL lookup from `PublicCollectionsAPIBaseURL` or `TranscriptAPIBaseURL` in Info.plist.
- [ ] Add empty Info.plist keys so release builds can configure the Worker without code changes.

### Task 2: Native Public Collection Screen

**Files:**
- Modify: `ios/OireachtasExplorer/ContentView.swift`

- [ ] Replace `publicCollection(slug:)` placeholder with `PublicCollectionScreen(slug:)`.
- [ ] Add `PublicCollectionModel` with loading, error, and collection state.
- [ ] Show collection hero metadata, title, description, and item count.
- [ ] Render saved items with type, dates, subtitle, citation, and quote.
- [ ] Route item links to native `AppRoute` values when the saved item hash is recognized; otherwise open external URLs when possible.

### Task 3: Verify

**Files:**
- Validate: iOS Swift sources and Xcode project

- [ ] Run Swift typecheck.
- [ ] Run full iOS build using the project scheme.
- [ ] Confirm `publicCollection` no longer points at `ResearchPlaceholderView`.
