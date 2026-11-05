# Subject-first customization

> Historical record of the static-JSON phase. Runtime content now comes exclusively from public Google Sheets. See [GOOGLE-SHEETS.md](GOOGLE-SHEETS.md) and the root README. Historical JSON fixtures live under `tests/fixtures/data/` and are not deployed.

## Inspection and reference

Inspected the existing router, Screen/Link/KeyBar components, static validators, question model, flashcard view, quiz provider/engine/results, document readers, source tests and browser tests before implementing this phase. The earlier persistence removal is retained: all state is React memory; there are no storage/database calls in application source.

The supplied https://e-learning.myazuki.net/learning redirected to /welcome while signed out. Its public page presented a subject-organized exam catalog and an entry for browsing all subjects. The signed-in learning screens were not accessible. The implementation takes inspiration from subject discovery and direct resource access, with independently designed subject cards, chapter hierarchy and scoped breadcrumbs.

## Plan implemented

1. Add subjects.json with ordered chapters; add required subjectId and optional chapterId to the existing resource indexes. Keep existing resource loaders and validate foreign keys centrally.
2. Adapt LibraryView to discover/search/filter subjects with counts derived from static indexes.
3. Add SubjectView with a chapter sidebar, chapter dropdown, three scoped resource tabs, search, document category filtering and grouped direct resource links.
4. Extend the original hash router to subject-owned routes; preserve Link/history handling and provide breadcrumbs on flashcards, reading, quizzes and results.
5. Reuse DeckView's React-state flip/navigation/shuffle/shortcuts, adding a reduced-motion-aware flip animation. Reuse the quiz engine unchanged except for optional source context carried through restart. Retain timer/deadline enforcement, grading and shuffled questions/options. Add an incorrect-only result filter.
6. Reuse the existing lazy document reader without modification. Replace the obsolete global DocumentsView and DeckFilters with the subject resource list.
7. Add Database Systems and Java chapter content; preserve all existing collections and document files within their new subjects.
8. Adapt route/browser tests, add relational validation and end-to-end chapter navigation tests, then build and visually inspect desktop/mobile themes.

## Data relationships

Subjects have stable IDs and ordered chapter definitions. The existing three resource indexes are retained; each entry must reference a subject and can reference a chapter in that subject. An omitted chapter means subject-wide material, shown under Subject essentials. The application computes resource counts, never stores progress. Direct resource loads verify ownership, so a resource URL under a different subject fails clearly.

Chapter and resource selection in URLs are content navigation, not progress. Card position, flip, shuffle, quiz answers/results/timer, reader page/zoom and theme choice remain memory-only. Reloading a chapter URL preserves the content route but starts every learning interaction fresh.

## Verification

16 unit/content/router tests and 20 desktop/mobile-emulated Chromium workflows pass. Coverage includes every resource file and count, subject/chapter references, rejected cross-subject resource URLs, empty/missing subjects/chapters, section/chapter switching, direct links, back navigation, scoring/review, timer expiration, all reader formats, reload/tab reset and browser-storage write traps. Production build and TypeScript pass. No dependencies were added for subject organization.
