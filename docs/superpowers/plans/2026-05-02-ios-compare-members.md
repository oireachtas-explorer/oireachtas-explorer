# iOS Compare Members Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the iOS compare placeholder with a native member comparison screen for the active chamber/session.

**Architecture:** Add a `CompareMembersScreen` in `ContentView.swift` that loads current members through the existing `OireachtasAPI.getMembers`, supports local search and selection of up to three members, and uses existing `memberCounts` for side-by-side activity cards. Keep date filters and vote split out of this first pass.

**Tech Stack:** SwiftUI, async/await, existing `AppSessionModel`, existing `OireachtasAPI`, existing route navigation.

---

### Task 1: Compare Screen Model

**Files:**
- Modify: `ios/OireachtasExplorer/ContentView.swift`

- [ ] Add `CompareMembersModel` that loads session members, stores selected member URIs, filters search results, and enforces a maximum of three selected members.
- [ ] Sort members by last name and full name.

### Task 2: Compare UI

**Files:**
- Modify: `ios/OireachtasExplorer/ContentView.swift`

- [ ] Replace `.compareMembers` placeholder with `CompareMembersScreen`.
- [ ] Add search field, selected-member chips, empty state, and side-by-side cards.
- [ ] Add profile navigation and remove actions per selected member.

### Task 3: Compare Activity Cards

**Files:**
- Modify: `ios/OireachtasExplorer/ContentView.swift`

- [ ] Add `CompareMemberCardModel` that loads counts for one member.
- [ ] Render debates, votes, questions, bills, offices, and committees.

### Task 4: Verify

**Files:**
- Validate: iOS Swift sources and Xcode project

- [ ] Run Swift typecheck.
- [ ] Run full iOS build using the project scheme.
- [ ] Confirm compare no longer points at `ResearchPlaceholderView`.
