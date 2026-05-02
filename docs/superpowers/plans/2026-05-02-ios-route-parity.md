# iOS Route Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace party, constituency, member, and committee placeholder routes in the iOS app with real SwiftUI destinations that match the web app's route behavior.

**Architecture:** Keep `AppSessionModel` as the active chamber/session source. Add route-specific SwiftUI screens that fetch the exact data needed for each route, and update member profile navigation to emit `AppRoute` values rather than generic filtered screens.

**Tech Stack:** SwiftUI, async/await, existing `OireachtasAPI` actor, existing native member/profile components.

---

### Task 1: Route Destinations

**Files:**
- Modify: `ios/OireachtasExplorer/ContentView.swift`
- Modify: `ios/OireachtasExplorer/Views/MemberProfileLoaderView.swift`
- Modify: `ios/OireachtasExplorer/Views/MemberProfileView.swift`

- [ ] Replace `partyMembers`, `constituencyMembers`, `memberProfile`, and `committee` placeholder branches in `ContentView.routeDestination`.
- [ ] Add `MemberRouteGridScreen` for party and constituency lists.
- [ ] Add `CommitteeRouteScreen` with paired-house member loading and web-style committee matching.
- [ ] Make `MemberProfileLoaderView` read `AppSessionModel` and fetch with `chamber`/`houseNo`.
- [ ] Update `MemberProfileView` party and committee links to navigate via `AppRoute`.

### Task 2: Verification

**Files:**
- No source edits expected.

- [ ] Run Swift type-check:

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer swiftc -typecheck -module-cache-path ios/build/ModuleCache.noindex -sdk /Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS26.4.sdk -target arm64-apple-ios16.0 $(rg --files ios/OireachtasExplorer -g '*.swift')
```

- [ ] Run `xcodebuild` if local simulator/runtime tooling allows it.

```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -project ios/OireachtasExplorer.xcodeproj -scheme OireachtasExplorer -configuration Debug -sdk iphoneos -destination generic/platform=iOS -derivedDataPath ios/build build CODE_SIGNING_ALLOWED=NO
```
