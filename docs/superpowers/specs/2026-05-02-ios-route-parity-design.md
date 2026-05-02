# iOS Route Parity Design

Date: 2026-05-02
Topic: Party, constituency, member, and committee route parity for the iOS app

## Goal

Replace the current placeholder-backed route handling for party, constituency, member, and committee destinations in the iOS app with concrete SwiftUI screens that behave like the existing web app.

This work is scoped to route behavior and route-driven screens only. The home screen may remain richer than the web app, including cabinet and Ceann Comhairle content, but taps from home and all other navigation sources should land on destinations that match the web app's semantics.

## In Scope

- `partyMembers` route
- `constituencyMembers` route
- `memberProfile` route
- `committee` route
- Chamber-aware and session-aware data loading needed to support those routes
- Replacing placeholder destinations for these routes in `ContentView.swift`
- Reusing existing native profile and member card UI where practical

## Out of Scope

- Bill viewer parity
- Saved items, collections, and compare parity
- Full web-to-iOS redesign of the browse-oriented `MembersView`
- New persistence, sharing, or public collection functionality
- Refactoring unrelated route or API code

## User-Facing Behavior

### Constituency Route

`constituencyMembers(code:name)` should open a dedicated route screen for the active chamber and selected house.

Behavior:

- Show the constituency or panel name as the route title.
- Load only members for that constituency or panel in the active chamber and house.
- Show the correct count and session label.
- Show an empty state if no members are returned.
- Tapping a member opens the member route through the loader path, not a placeholder.

This route should not behave like a generic "all members" directory. It must map to one concrete route target, like the web app.

### Party Route

`partyMembers(partyName)` should open a dedicated route screen for the active chamber and selected house.

Behavior:

- Show the party name as the route title.
- Load all members for the active chamber and house, then filter to the exact party name.
- Show the correct count and session label.
- Show an empty state if the filtered result is empty.
- Tapping a member opens the member route through the loader path.

### Member Route

`memberProfile(memberUri:memberName:constituencyCode:constituencyName)` should always resolve to a real profile destination.

Behavior:

- The route should no longer fall back to a placeholder based on whether `memberName` is present.
- The route should always use `MemberProfileLoaderView`.
- The loader must fetch member data for the active chamber and selected house so the resulting profile aligns with the current session.
- The resulting destination remains the existing native `MemberProfileView`.

This preserves the existing native profile surface while making route behavior match the web app's route semantics.

### Committee Route

`committee(uri:name)` should open a dedicated committee route screen with membership behavior matching the web app.

Behavior:

- Show the committee name as the route title.
- Load members from the active chamber and house.
- When the current house has a paired house, also load members from the paired chamber and paired house.
- Merge results by `member.uri`.
- Match committee membership by exact `committee.uri` when available.
- Fall back to normalized committee name matching when URI matching is insufficient.
- Order members by role first, then chamber grouping, then surname.
- Show role labels and chamber context in the UI.
- Tapping a member opens the member route through the loader path.

This is especially important for joint committees, where a single-house fetch may look incomplete.

## Architecture

The implementation should prefer thin route-specific screens over broad refactors.

Plan:

- Keep `AppSessionModel` as the source of chamber and house state.
- Replace placeholder branches in `ContentView.routeDestination` for:
  - `partyMembers`
  - `constituencyMembers`
  - `memberProfile`
  - `committee`
- Introduce explicit SwiftUI route screens or wrappers for party, constituency, and committee flows.
- Reuse existing `MemberCardView` and profile UI where it already fits.

This keeps the change local to route parity without forcing a redesign of browse flows.

## Data Loading Design

### Constituency

Route screen fetch:

- Use `OireachtasAPI.shared.getMembers(chamber:houseNo:constCode:)`
- Use the active `session.chamber`
- Use the active `session.selectedHouseNo`

No additional caching layer is needed beyond the existing API actor cache for this pass.

### Party

Route screen fetch:

- Use `OireachtasAPI.shared.getMembers(chamber:houseNo:)`
- Filter by exact `member.party == partyName`

This matches the web app's route behavior closely enough without introducing a separate party endpoint.

### Member

`MemberProfileLoaderView` should become chamber-aware and session-aware.

Changes:

- Accept chamber and house number as inputs or read them from `AppSessionModel`.
- Fetch member details with `OireachtasAPI.shared.getMembers(chamber:houseNo:memberUri:)`

This avoids the current Dáil-default behavior and ensures route navigation stays aligned with the selected session.

### Committee

Committee loading should mirror web logic:

1. Load all members for the active chamber and house.
2. Determine whether there is a paired house.
3. If paired, load all members for the paired chamber and paired house.
4. Merge both sets by `member.uri`.
5. Match membership by:
   - `committee.uri == targetUri`, or
   - normalized `committee.name == normalizedTargetName`
6. Sort results by:
   - known chair and vice-chair roles first
   - Dail before Seanad
   - last name ascending

The normalization helper should mirror the web app's pragmatic approach rather than inventing a new matching model.

## UI Design

### Constituency and Party Screens

Use the current native visual language:

- Existing cream background
- Existing header typography
- Existing member card grid
- Existing loading and error helpers

Differences from the browse-oriented `MembersView`:

- These are route screens, not search-first discovery screens.
- The title and subtitle should describe the route target and session.
- No placeholder framing.

### Committee Screen

Use a dedicated list-style presentation rather than the generic filtered grid.

Each row should include:

- member photo or initials
- member name
- party badge
- constituency or panel
- chamber label
- committee role label

This better matches the informational density of the web committee page while staying native.

## Error Handling

Each route screen should handle its own states:

- loading: centered progress state
- error: inline error banner
- empty: route-specific empty copy

Rules:

- No fallback placeholder view once the route is implemented.
- No automatic redirect to a different route if data is empty.
- No global error state for this slice.

## Navigation Rules

- Home card taps should continue to be allowed to present richer home content.
- Once the user taps through to a route, the route destination must match web semantics exactly.
- Member taps from party, constituency, committee, and search should all use the member route path.
- Committee taps from member profiles should use the committee route path.
- Party taps from member profiles should use the party route path.

## Files Expected To Change

- `ios/OireachtasExplorer/ContentView.swift`
- `ios/OireachtasExplorer/Views/MemberProfileLoaderView.swift`
- `ios/OireachtasExplorer/Views/MembersView.swift`
- `ios/OireachtasExplorer/Views/FilteredMembersView.swift`
- One or more new SwiftUI route screen files under `ios/OireachtasExplorer/Views/`
- Potentially `ios/OireachtasExplorer/Models/Models.swift` for small helper additions
- Potentially `ios/OireachtasExplorer/API/OireachtasAPI.swift` for any missing chamber-aware convenience support

## Testing Strategy

### Verification

- Swift type-check all iOS Swift files against the iPhoneOS SDK.
- If simulator tooling is available, run an Xcode build for the target.
- Manually verify route paths:
  - home -> party
  - home -> constituency
  - search -> member
  - member profile -> party
  - member profile -> committee
  - committee -> member

### Expected Manual Outcomes

- No placeholder screens for these routes
- Correct chamber and session labels
- Correct member counts
- Joint committee membership includes paired-house members when appropriate
- Member routes load the active chamber and session record

## Risks

- Committee membership data can be inconsistent across sessions, so URI matching alone may miss valid members.
- Party naming must remain exact or the filtered route may appear empty.
- `MembersView` currently assumes Dail-oriented copy in places, so partial reuse should be deliberate.
- Member loading defaults have historically leaned on Dail values; route-backed navigation must not silently regress to those defaults.

## Chosen Approach

Use a web-screen port for route behavior, implemented as native SwiftUI route screens that mirror web semantics. Reuse existing native UI components where they already fit, but prioritize route correctness and user familiarity over preserving the placeholder migration scaffolding.
