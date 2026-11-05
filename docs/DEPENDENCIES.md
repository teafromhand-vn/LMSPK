# Dependency review

The original app had React and React DOM as its only runtime dependencies. The customization retains the toolchain and adds only local rendering/icon libraries:

| Runtime package | License | Purpose |
| --- | --- | --- |
| react / react-dom | MIT | Existing UI and in-memory state |
| pdfjs-dist | Apache-2.0 | Locally bundled PDF rendering and worker |
| docx-preview | Apache-2.0 | Local DOCX rendering; JSZip is its ZIP reader |
| react-markdown | MIT | Markdown-to-React rendering without raw HTML execution |
| lucide-react | ISC | Tree-shaken interface icons |

Development dependencies: TypeScript (Apache-2.0), Vite and React plugin (MIT), Vitest (MIT), Playwright (Apache-2.0), type declarations (MIT), pdf-lib (MIT) and docx (MIT). The latter two generate the committed sample documents only; they are not included in the application runtime.

Removed fake-indexeddb because the database and its tests no longer exist. No database, authentication, telemetry, payment or backend SDK remains. npm audit reported zero known vulnerabilities after updating the upstream Vitest lockfile to 4.1.12. This is a point-in-time check, not a guarantee about future advisories.

Exact versions and transitive license identifiers are recorded in package-lock.json. Package license/notice files remain in node_modules on installation; upstream Enyalië's LICENSE is retained unchanged. A distributable third-party notice is generated into public/THIRD-PARTY-NOTICES.txt by scripts/third-party-notices.mjs.
