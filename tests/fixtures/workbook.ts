/** Test-only adapter for historical fixtures; never imported by application code. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Collection, Deck, LearningDocument, Subject } from '../../src/models/types';
const json = (path: string) => JSON.parse(readFileSync(resolve('tests/fixtures/data', path), 'utf8'));
function values(rows: Record<string, unknown>[], columns: string[]) {
  return { values: [columns, ...rows.map((row) => columns.map((key) => row[key] ?? ''))] };
}
export function fixtureWorkbook() {
  const subjects: Subject[] = json('subjects.json');
  const chapters = subjects.flatMap((s) => s.chapters.map((c) => ({ ...c, subjectId: s.id })));
  const collections = ['flashcards', 'tests'].flatMap((kind) =>
    (json(`${kind}/index.json`) as (Collection & { file: string })[]).map((c) => ({
      ...c,
      kind,
      sheetId: `${kind}-${c.id}`,
    })),
  );
  const questions = collections.flatMap((c) => {
    const deck: Deck = json(c.file.replace(/^data\//, ''));
    return deck.questions.map((q) => ({
      collectionId: c.sheetId,
      ...q,
      choices: 'choices' in q ? JSON.stringify(q.choices) : '',
      correctIndices:
        q.type === 'multiple_choice'
          ? JSON.stringify([q.correctIndex])
          : q.type === 'multiple_select'
            ? JSON.stringify(q.correctIndices)
            : '',
      image: q.type === 'flashcard' ? q.image?.src : '',
      imageAlt: q.type === 'flashcard' ? q.image?.alt : '',
      backImage: q.type === 'flashcard' ? q.backImage?.src : '',
      backImageAlt: q.type === 'flashcard' ? q.backImage?.alt : '',
    }));
  });
  const documents: LearningDocument[] = json('documents/index.json');
  return {
    valueRanges: [
      values(subjects as unknown as Record<string, unknown>[], [
        'id',
        'courseId',
        'name',
        'description',
        'semester',
        'category',
        'color',
      ]),
      values(chapters, ['subjectId', 'id', 'name', 'description']),
      values(
        collections.map((c) => ({ ...c, id: c.sheetId })),
        ['id', 'subjectId', 'chapterId', 'kind', 'name', 'description', 'category'],
      ),
      values(questions, [
        'collectionId',
        'id',
        'type',
        'prompt',
        'answer',
        'choices',
        'correctIndices',
        'explanation',
        'image',
        'imageAlt',
        'backImage',
        'backImageAlt',
      ]),
      values(documents as unknown as Record<string, unknown>[], [
        'id',
        'subjectId',
        'chapterId',
        'name',
        'description',
        'category',
        'format',
        'file',
        'detail',
      ]),
    ],
  };
}
