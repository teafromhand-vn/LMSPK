import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { validateDeck, validateIndex, validateSubjects, assembleCatalog } from '../src/lib/contentValidation';
import type { Collection, LearningDocument } from '../src/models/types';
const json = (path: string) => JSON.parse(readFileSync(resolve('tests/fixtures', path), 'utf8'));
describe('Historical content fixtures and document assets', () => {
  it('resolves every resource to a real subject and optional chapter with accurate catalog counts', () => {
    const subjects = validateSubjects(json('data/subjects.json'));
    const cards = validateIndex(json('data/flashcards/index.json')) as Collection[];
    const docs = validateIndex(json('data/documents/index.json'), true) as LearningDocument[];
    const tests = validateIndex(json('data/tests/index.json')) as Collection[];
    const catalog = assembleCatalog(subjects, cards, docs, tests);
    expect(catalog).toHaveLength(8);
    const database = catalog.find((c) => c.subject.id === 'database')!;
    expect(database.subject.chapters).toHaveLength(3);
    expect(database.flashcards).toHaveLength(3);
    expect(database.documents).toHaveLength(3);
    expect(database.tests).toHaveLength(3);
    expect(() => assembleCatalog(subjects, [{ ...cards[0], chapterId: 'missing' }], [], [])).toThrow();
    expect(() => assembleCatalog(subjects, [{ ...cards[0], subjectId: 'missing' }], [], [])).toThrow();
    expect(() => validateSubjects([...subjects, subjects[0]])).toThrow();
  });
  for (const module of ['flashcards', 'tests'] as const)
    it(`${module}: every manifest entry loads and matches its declared count`, () => {
      const entries = validateIndex(json(`data/${module}/index.json`)) as (Collection & { file: string })[];
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        const deck = validateDeck(json(entry.file), module);
        expect(deck.questions.length).toBe(entry.count);
        for (const q of deck.questions)
          if (q.type === 'flashcard')
            for (const image of [q.image, q.backImage])
              if (image) expect(existsSync(resolve('public', image.src))).toBe(true);
      }
    });
  it('publishes actual PDF, DOCX, Markdown and TXT files under documents/', () => {
    const docs = validateIndex(json('data/documents/index.json'), true) as LearningDocument[];
    expect(new Set(docs.map((d) => d.format))).toEqual(new Set(['pdf', 'docx', 'md', 'txt']));
    for (const doc of docs) {
      expect(doc.file.startsWith('documents/')).toBe(true);
      const bytes = readFileSync(resolve('public', doc.file));
      expect(bytes.length).toBeGreaterThan(100);
      if (doc.format === 'pdf') expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
      if (doc.format === 'docx') expect(bytes.subarray(0, 2).toString()).toBe('PK');
    }
  });
  it('rejects malformed data and invalid indices before it reaches a player', () => {
    expect(() =>
      validateDeck(
        {
          name: 'Bad',
          description: '',
          questions: [
            { id: 'x', prompt: 'Bad', tags: [], type: 'multiple_select', choices: ['A', 'B'], correctIndices: [4] },
          ],
        },
        'tests',
      ),
    ).toThrow();
    expect(() => validateIndex([{ id: 'bad', file: '../outside' }])).toThrow();
  });
  it('has no storage, worker registration, database or tracking APIs in application source', () => {
    function scan(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? scan(join(dir, e.name)) : /\.(tsx?|html)$/.test(e.name) ? [join(dir, e.name)] : [],
      );
    }
    for (const file of [...scan('src'), 'index.html'])
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|serviceWorker|caches\.open/,
      );
  });
});
