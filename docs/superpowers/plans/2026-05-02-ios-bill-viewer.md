# iOS Bill Viewer Middle Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the iOS bill placeholder route with a native bill detail screen that matches the web app's core bill information while opening official documents externally.

**Architecture:** Extend the existing iOS legislation domain model to carry the web bill fields needed by detail screens, add a focused `getBill(billNo:billYear:)` API call, and route `.billViewer` to a SwiftUI detail screen in `ContentView.swift`. Keep PDF handling lightweight by opening document URLs through SwiftUI `openURL` instead of embedding a PDF viewer.

**Tech Stack:** SwiftUI, async/await, existing `OireachtasAPI` actor, existing route enum and design system.

---

### Task 1: Expand Bill Domain Model

**Files:**
- Modify: `ios/OireachtasExplorer/Models/Models.swift`
- Modify: `ios/OireachtasExplorer/API/OireachtasAPI.swift`

- [ ] Add decoded fields for bill related documents, sponsor office names, stage progress/completion, and bill document value types.
- [ ] Normalize sponsors as display names, including office sponsors when no member sponsor is present.
- [ ] Normalize versions and related documents into arrays used by the detail screen.
- [ ] Preserve existing list behavior by keeping `pdfUri` as the first version PDF.

### Task 2: Add Bill Detail Fetch

**Files:**
- Modify: `ios/OireachtasExplorer/API/OireachtasAPI.swift`

- [ ] Add `getBill(billNo:billYear:) async throws -> Bill?` that calls `/legislation` with `bill_no`, `bill_year`, and `limit=1`.
- [ ] Reuse `normalizeBill` so the list and detail screens share the same data shape.

### Task 3: Replace Bill Placeholder Route

**Files:**
- Modify: `ios/OireachtasExplorer/ContentView.swift`

- [ ] Replace `.billViewer` placeholder with `BillViewerScreen(billNo:billYear:)`.
- [ ] Add `BillViewerModel` with loading, error, and bill state.
- [ ] Add `BillViewerScreen` with route header, status/title/long title, sponsors, current status, timeline, versions, related documents, and external PDF open buttons.
- [ ] Keep styling aligned with existing `LegislationListScreen`, `BillSummaryRow`, and the route screens added for party/committee parity.

### Task 4: Verify

**Files:**
- Validate: iOS Swift sources and Xcode project

- [ ] Run Swift typecheck.
- [ ] Run full iOS build using the project scheme.
- [ ] Confirm bill placeholders no longer appear on `.billViewer` while unrelated placeholders remain out of scope.
