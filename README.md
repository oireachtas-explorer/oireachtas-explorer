# Oireachtas Explorer

An unofficial, multi-platform research tool for browsing the work of the
**Houses of the Oireachtas** — Ireland's parliament. It surfaces
members, constituencies, voting records, debates, parliamentary
questions, and legislation across every Dáil in history, drawn live
from the public Oireachtas Open Data API.

Available as a **single-page web application**, a **native Android application**, and a **native iOS application**.

![Built with React](https://img.shields.io/badge/React-19-149eca)
![Built with TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6)
![Built with Vite](https://img.shields.io/badge/Vite-8-646cff)
![Data licence](https://img.shields.io/badge/data-CC--BY%204.0-green)

> **Unofficial.** This project is not affiliated with, endorsed by, or
> connected to the Houses of the Oireachtas, the Houses of the
> Oireachtas Commission, or the Houses of the Oireachtas Service.

## Features

- **Global Dáil selector.** Switch between any of Ireland's 34 Dáil
  sessions from the persistent header dropdown on every page.
- **34 historical Dálaí.** Browse any session going back to 1919 via
  the header session picker.
- **Constituency browsing.** Find members by geography with a
  type-ahead searchable constituency picker.
- **Party breakdown.** Composition bar chart with party colours and
  seat counts for the selected Dáil term.
- **Rich member profiles.** For each TD:
  - activity summary (debates, votes, questions, bills)
  - full voting breakdown donut (Tá / Níl / Staon) — fetches the
    **complete** voting record for the term via paginated API calls,
    not just a sample
  - paginated lists of debates, voting record, questions asked, and
    legislation sponsored
  - party and constituency links that navigate to filtered views
  - activity stat cards link directly through to the relevant tab
- **Advanced debates index:**
  - filter by chamber: Dáil Plenary, Committees, or All
  - explicit committee picker (Public Accounts, Health, Transport, etc.)
  - date range pickers defaulting to the Dáil term start/end dates
  - client-side smart search filtering loaded debates by title or
    committee name
  - topic dropdown within each debate record so committee agendas are
    navigable inline
- **Official debate transcripts.** Click into any debate to read the
  published XML transcript.
- **Parliamentary questions with official responses.** Expand a
  question to fetch and display the minister's transcribed reply.
- **Bill pages** with status, current stage, source, and sponsors.
- **Accessibility.** Keyboard-navigable tabs, skip link, ARIA tablist
  wiring, labelled regions, and visible focus states.
- **Session-scoped response cache** in the API layer so re-fetched
  pages are served from memory without hitting the network twice.
- **Client-side IndexedDB cache** for parsed debate transcripts, so
  large XML documents are only parsed once per visit.

## Data source and licence

All parliamentary data is sourced live, at request time, from the
[Oireachtas Open Data API](https://api.oireachtas.ie/).

> Parliamentary data © Houses of the Oireachtas, reused under the
> [Oireachtas (Open Data) PSI Licence](https://www.oireachtas.ie/en/open-data/license/),
> which incorporates the
> [Creative Commons Attribution 4.0 International Licence](https://creativecommons.org/licenses/by/4.0/).

Data rendered by the app is filtered, paginated, reformatted, and
combined across endpoints; it may not reflect the complete or most
current official record. Authoritative records are at
<https://www.oireachtas.ie/>.

A full statement of attribution, modifications, and the disclaimer of
warranties is in [`NOTICE`](./NOTICE) and in the persistent in-app
footer.

Official crests, insignia, and emblems (including the harp) are
**excluded** from the scope of the PSI Licence and are not used by
this application. The logo is an original design.

## Tech stack

### Web Application

| Layer        | Choice                                            |
|--------------|---------------------------------------------------|
| UI runtime   | React 19                                          |
| Language     | TypeScript 6 (strict)                             |
| Build / dev  | Vite 8                                            |
| Routing      | Hash-based, `#/<houseNo>/<view>`                  |
| Data fetch   | Native `fetch` with in-memory response cache      |
| Local cache  | IndexedDB via a thin wrapper (parsed transcripts) |
| Icons        | lucide-react                                      |

### Android Application

| Layer        | Choice                                            |
|--------------|---------------------------------------------------|
| Language     | Kotlin 2.1                                        |
| UI Framework | Jetpack Compose (Material 3)                      |
| Networking   | Retrofit 2 + OkHttp 4                             |
| JSON Parsing | Moshi 1.15                                        |
| Image Load   | Coil 2.7                                          |
| Navigation   | Compose Navigation                                |

### iOS Application

| Layer        | Choice                                            |
|--------------|---------------------------------------------------|
| Language     | Swift 6                                           |
| UI Framework | SwiftUI                                           |
| Networking   | URLSession (async/await)                          |
| JSON Parsing | Codable                                           |
| Image Load   | Shared URLCache                                   |
| Navigation   | NavigationStack + TabView                         |

### Shared Tooling

- **Data source:** [Oireachtas Open Data API](https://api.oireachtas.ie/)
- **Linting:** ESLint 9 (Web), ktlint (Android)
- **CI/CD:** GitHub Actions (Web deployment to GitHub Pages)

There is **no backend** and no server-side rendering. Everything runs
in the browser and talks directly to `api.oireachtas.ie` and
`data.oireachtas.ie`.

## Project layout

```
oireachtas/
├── index.html                 # Vite entry (Web)
├── public/                    # Static assets (Web)
├── src/                       # React source code (Web)
│   ├── App.tsx                # Shell & routing
│   ├── api/                   # Oireachtas API wrappers
│   ├── components/            # UI components
│   └── ...
├── android/                   # Native Android application
│   ├── app/                   # App module
│   │   ├── src/main/java/     # Kotlin source code
│   │   └── src/main/res/      # Android resources
│   └── ...
├── ios/                       # Native iOS application
│   ├── OireachtasExplorer/    # App source code (SwiftUI)
│   ├── OireachtasExplorer.xcodeproj
│   └── ...
├── .github/workflows/
│   └── deploy.yml             # Web deployment pipeline
├── vite.config.ts             # Web build config
└── package.json               # Web dependencies
```

## Getting started

### Web Application

Prerequisites: Node 20+ and npm.

```sh
npm install
npm run dev         # http://localhost:5174
```

### Android Application

Prerequisites: Android Studio Ladybug+ and Android SDK 35.

1. Open the `android/` folder in Android Studio.
2. Sync the project with Gradle files.
3. Run the `app` module on an emulator or physical device (API 26+).

### iOS Application

Prerequisites: Xcode 16+ and macOS.

1. Open `ios/OireachtasExplorer.xcodeproj` in Xcode.
2. Ensure the active scheme is `OireachtasExplorer`.
3. Run on an iOS Simulator or physical device (iOS 17+).

Other scripts:

```sh
npm run build       # tsc -b && vite build  — emits to dist/
npm run preview     # serve the built bundle locally
npm run lint        # eslint .
npm run deploy      # build + push dist/ to the gh-pages branch
```

## Deploying to GitHub Pages

Deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`).
Every push to `main` triggers a build and publishes the result to the
`gh-pages` environment.

**One-time setup:**

1. Push this repository to GitHub (e.g. at `github.com/<you>/oireachtas-explorer`).
2. In the repository **Settings → Pages**, set the source to
   **GitHub Actions**.
3. Push any commit to `main` — the workflow will build and deploy
   automatically.

The live URL will be `https://<you>.github.io/oireachtas-explorer/`.

> **If you rename the repository**, update `base` in `vite.config.ts`
> to match the new name, e.g. `base: '/new-repo-name/'`.

### Manual deploy (alternative)

```sh
npm run deploy      # runs npm run build then gh-pages -d dist
```

This publishes the `dist/` folder to the `gh-pages` branch directly.
GitHub's Pages source must be set to **Deploy from a branch → gh-pages**
for this method.

## Routing

Hash routes are shaped as:

```
#/<houseNo>/<view…>
```

Examples:

```
#/34                            Home — 34th Dáil
#/34/debates                    Global debates index
#/34/constituency/DN/Dublin%20North   Members for a constituency
#/34/member/<uri>/…             Member profile
```

## Contributing

Issues and pull requests are welcome. If you're adding a feature that
displays new Oireachtas data, please keep the attribution footer and
`NOTICE` file in sync.

## Licence

The **application source code** in this repository is proprietary.
All rights reserved.

The **parliamentary data** rendered by the application is not part of
this repository and is governed separately by the Oireachtas (Open
Data) PSI Licence — see [`NOTICE`](./NOTICE).
