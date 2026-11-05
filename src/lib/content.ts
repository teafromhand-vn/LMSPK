import type { Deck, SubjectContent, Syllabus } from '../models/types';
import { fetchWorkbook, parseWorkbook, type SheetContent } from './sheets';
export { flashcards, resourceContext } from './contentValidation';

/** Public document assets, resolved correctly on root and GitHub Pages deployments. */
export function assetUrl(path: string): string {
  if (!/^documents\/[\w./-]+$/.test(path) || path.split('/').includes('..'))
    throw new Error('Đường dẫn tệp phải nằm trong documents/.');
  return new URL(`${import.meta.env.BASE_URL}${path}`, document.baseURI).href;
}

// Only source content is shared in memory. Failed requests are evicted for retry.
// Reloading the page fetches the sheet again; no answers/results are cached here.
let content: Promise<SheetContent> | undefined;
function loadContent(): Promise<SheetContent> {
  if (!content) {
    content = fetchWorkbook({
      spreadsheetId: import.meta.env.VITE_GOOGLE_SPREADSHEET_ID ?? '',
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY ?? '',
    })
      .then(parseWorkbook)
      .catch((error: unknown) => {
        content = undefined;
        throw error;
      });
  }
  return content;
}
export async function loadCatalog(): Promise<SubjectContent[]> {
  return (await loadContent()).catalog;
}
export async function loadSyllabus(): Promise<Syllabus[]> {
  return (await loadContent()).syllabus;
}
export async function loadSubject(id: string): Promise<SubjectContent> {
  const entry = (await loadCatalog()).find((s) => s.subject.id === id);
  if (!entry) throw new Error('Không tìm thấy môn học này.');
  return entry;
}
export async function loadDeck(id: string, module: 'flashcards' | 'tests'): Promise<Deck> {
  const deck = (await loadContent()).decks.get(`${module}/${id}`);
  if (!deck) throw new Error('Không tìm thấy bộ câu hỏi này.');
  return deck;
}
