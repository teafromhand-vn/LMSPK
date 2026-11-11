# Repository evaluation and modification plan

Evaluated 4 November 2026 using GitHub repository search and upstream source/READMEs. GitHub dates indicate activity, not independent assurance of quality. Published demos were identified; functionality is verified locally in this customization.

| Candidate | License / activity observed | Fit and modification cost |
| --- | --- | --- |
| [LMSPK](https://github.com/adidoppalapudi/enyalie) | MIT; 2026-10-30; [demo](https://adidoppalapudi.github.io/enyalie/) | Selected. React 19 + TypeScript + Vite, only two runtime dependencies. Existing flashcards, MCQ/TF, explanations, shuffle, accessible keyboard controls and JSON starter decks. Remove isolated storage/editor features; add documents and multi-select. |
| [StudyCompanion](https://github.com/MartinSA04/StudyCompanion) | MIT in GitHub search; 2026-11-01; course demo available | Static YAML/MDX, flashcards and quiz widgets, but Astro integration/course framework rather than React application; more architectural changes for requested React state. |
| [Quizmill](https://github.com/quizmill/quizmill) | MIT; 2026-11-03; quizmill.dev | Static JSON and tests, but Next.js engine/CLI with persistence, sync, analytics, license unlocks, payments links and multiple practice modes. Much larger removal surface. |
| [Quizaroni](https://github.com/yusufaf/quizaroni) | MIT in search; 2026-11-04; published demo | React plus AWS Lambda/DynamoDB/S3/Cognito monorepo. Unnecessary infrastructure. |
| [flashcard-quiz](https://github.com/MaitisamY/flashcard-quiz) | GitHub labels MIT but package says UNLICENSED; 2024-03-21 | Small React app, but less functionality, older activity and conflicting license metadata. |

## Provenance

Cloned full Git history, not a new scaffold. Origin: `https://github.com/adidoppalapudi/enyalie.git`. Baseline: `a13be9791b52a71f603a016a9a721ab4bfa608ef`. Upstream MIT copyright remains in LICENSE. This derivative is **LMSPK / Study library**.

## Inspection before modification

- `src/main.tsx`, `App.tsx`: React StrictMode entry, providers and routed views.
- `src/app/router.ts`: small hash router, suitable for static hosts.
- `src/models/types.ts`: discriminated question types; deck/question records.
- `src/quiz/engine.ts`, `describe.ts`: pure shuffle, answer checking, session transitions, summaries and explanation labels.
- `src/views/QuizView.tsx`: keyboard-first MCQ, TF and revealable flashcard answers. `ResultsView.tsx`: scores and explanations.
- `src/components`: Screen, KeyBar, Notice, Link, Box, Meter, ErrorBoundary and forms.
- `src/starter-decks`: JSON deck files imported into IndexedDB through `src/io` and `src/db`.
- `src/db`: IndexedDB content CRUD, mastery, recorded quiz history. `quiz/persistence.ts`: sessionStorage. `quiz/personalBests.ts` and `lib/palette.ts`: localStorage. `public/sw.js`: offline asset caching.
- No existing document reader, authentication, remote database, payment, social, tracking SDK or backend service. Browser history contains navigation depth only.
- Original runtime dependencies: React/React DOM (MIT). Development stack: TypeScript (Apache-2.0), Vite/Vitest/React plugin (MIT); fake-indexeddb (Apache-2.0) only supported the removed database tests.

## Retain / modify / remove

1. Retain Vite/TypeScript/React toolchain, hash routing, Link, KeyBar, useHotkeys, useAsync, Notice, ErrorBoundary, Box, Meter and Fisher–Yates shuffle. Keep LMSPK branding and its bottom keyboard-action bar.
2. Adapt existing question schema and pure quiz engine to read-only content, add multi-select exact-set grading, remove streak/mastery bookkeeping while retaining the per-question timer. Keep session provider exclusively in React state. Adapt QuizView/ResultsView to deferred submission and full answer review.
3. Adapt LibraryView/DeckFilters to static collections and subject filtering. Extract flashcard studying from the original quiz/reveal interaction into a dedicated DeckView with flip/previous/next/shuffle/images.
4. Replace the IndexedDB loading boundary with validated same-origin JSON fetches under public/data. Keep selected original question wording, answers and references; split flashcards and tests into separate indexes.
5. Remove database, import/export/edit dialogs, progress, best scores, palette persistence, service worker, PWA manifest, unused tests/helpers and unused dependencies. Do not merely hide these routes.
6. Add locally bundled PDF.js, DOCX rendering and Markdown reading; no hosted viewer or third-party request. Add pagination and zoom for every format, plus fullscreen reading.
7. Replace text-mode styling with a responsive editorial layout and light/dark themes held in React state. Exactly three primary navigation links.
8. Verify grading, content validation, all reader formats, keyboard/mobile interactions, reload/tab-close reset and absence of browser-storage writes. Record results in README.

## Updated requirements and implementation notes

The follow-up request explicitly retained the quiz timer. The customized engine preserves the upstream deadline-checking behavior (including late callbacks and duplicate-answer locking) and 100-point base scoring. It removes only speed/streak bonuses. Timed questions use a draft selection followed by confirmation, so multiple-select questions work fairly; untimed answers can be revised until final submission. Answer review includes every question.

The original tests for database CRUD, editor validation, import/export, mastery, persisted sessions, best scores and PWA caching were removed together with those features. Engine/router coverage was adapted to the reduced contracts; static content and real-browser tests were added. This is not a claim that the obsolete persistence suite still passes unchanged.

Original starter-deck subsets are migrated into public/data, retaining prompts, answers and explanations. The unselected bulk deck catalog was removed from the active tree; it remains available in Git history. scripts/prepare-content.mjs records the exact migration using the pinned upstream revision. It is a one-time migration tool, not the normal content publishing workflow.
