import type {
  Collection,
  Deck,
  LearningDocument,
  Question,
  Subject,
  SubjectContent,
  ResourceContext,
} from '../models/types';

import { isDocumentUrl } from './documentUrl';

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function path(value: unknown): value is string {
  return text(value) && /^documents\/[\w./-]+$/.test(value) && !value.split('/').includes('..');
}
export function validateIndex(value: unknown, documents = false): Collection[] | LearningDocument[] {
  if (!Array.isArray(value)) throw new Error('Content index must be an array.');
  const ids = new Set<string>();
  for (const entry of value) {
    if (
      !record(entry) ||
      !['id', 'name', 'category', 'subject', 'subjectId'].every((key) => text(entry[key])) ||
      (entry.chapterId !== undefined && !text(entry.chapterId)) ||
      !['blue', 'green', 'purple', 'amber'].includes(String(entry.color))
    )
      throw new Error('Invalid content index entry.');
    if (ids.has(String(entry.id))) throw new Error(`Duplicate content id: ${entry.id}`);
    ids.add(String(entry.id));
    if (
      documents
        ? !['pdf', 'docx', 'md', 'txt'].includes(String(entry.format)) ||
          !(path(entry.file) || isDocumentUrl(entry.file))
        : !Number.isInteger(entry.count) || Number(entry.count) < 1
    )
      throw new Error(`Invalid metadata for ${entry.id}.`);
  }
  return value as Collection[] | LearningDocument[];
}
export function validateDeck(value: unknown, module: 'flashcards' | 'tests'): Deck {
  if (
    !record(value) ||
    !text(value.name) ||
    !Array.isArray(value.questions) ||
    !value.questions.length
  )
    throw new Error('A collection needs a name and at least one question.');
  const ids = new Set<string>();
  for (const q of value.questions) {
    if (
      !record(q) ||
      !text(q.id) ||
      !text(q.prompt) ||
      !Array.isArray(q.tags) ||
      !q.tags.every((t) => typeof t === 'string') ||
      (q.explanation !== undefined && typeof q.explanation !== 'string')
    )
      throw new Error('Invalid question.');
    if (ids.has(q.id)) throw new Error(`Duplicate question id: ${q.id}`);
    ids.add(q.id);
    if (
      module === 'flashcards'
        ? q.type !== 'flashcard'
        : !['multiple_choice', 'multiple_select', 'true_false'].includes(String(q.type))
    )
      throw new Error(`Wrong question type in ${module}.`);
    if (q.type === 'flashcard') {
      if (!text(q.answer)) throw new Error('A flashcard needs an answer.');
      for (const key of ['image', 'backImage'])
        if (q[key] !== undefined && (!record(q[key]) || !path(q[key].src) || !text(q[key].alt)))
          throw new Error('Images need a local path and alt text.');
    } else if (q.type === 'true_false') {
      if (typeof q.answer !== 'boolean') throw new Error('True/false answers must be boolean.');
    } else {
      if (!Array.isArray(q.choices) || q.choices.length < 2 || !q.choices.every(text))
        throw new Error('At least two choices are required.');
      const size = q.choices.length;
      const valid = (i: unknown) => Number.isInteger(i) && Number(i) >= 0 && Number(i) < size;
      if (
        q.type === 'multiple_choice'
          ? !valid(q.correctIndex)
          : !Array.isArray(q.correctIndices) ||
            !q.correctIndices.length ||
            !q.correctIndices.every(valid) ||
            new Set(q.correctIndices).size !== q.correctIndices.length
      )
        throw new Error('Invalid correct answer indices.');
    }
  }
  return value as unknown as Deck;
}
export function matches(item: Collection | LearningDocument, query: string, category: string, subject: string) {
  return (
    (!category || item.category === category) &&
    (!subject || item.subject === subject) &&
    `${item.name} ${item.category} ${item.subject}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );
}
export function flashcards(questions: Question[]) {
  return questions.filter((q) => q.type === 'flashcard');
}
export function validateSubjects(value: unknown): Subject[] {
  if (!Array.isArray(value)) throw new Error('Subjects must be an array.');
  const ids = new Set<string>();
  for (const s of value) {
    if (
      !record(s) ||
      !['id', 'name', 'category'].every((key) => text(s[key])) ||
      !/^[a-z0-9-]+$/.test(String(s.id)) ||
      !Number.isInteger(s.semester) ||
      Number(s.semester) < 1 ||
      (s.courseId !== undefined && !text(s.courseId)) ||
      !['blue', 'green', 'purple', 'amber'].includes(String(s.color)) ||
      !['database', 'code', 'globe', 'flask', 'leaf', 'languages', 'book'].includes(String(s.icon)) ||
      !Array.isArray(s.chapters)
    )
      throw new Error('Invalid subject metadata.');
    if (ids.has(String(s.id))) throw new Error(`Duplicate subject: ${s.id}`);
    ids.add(String(s.id));
    const chapters = new Set<string>();
    for (const c of s.chapters) {
      if (
        !record(c) ||
        !text(c.id) ||
        !/^[a-z0-9-]+$/.test(c.id) ||
        !text(c.name) ||
        chapters.has(c.id)
      )
        throw new Error(`Invalid or duplicate chapter in ${s.id}.`);
      chapters.add(c.id);
    }
  }
  return value as Subject[];
}
export function assembleCatalog(
  subjects: Subject[],
  cards: Collection[],
  documents: LearningDocument[],
  tests: Collection[],
): SubjectContent[] {
  for (const resource of [...cards, ...documents, ...tests]) {
    const subject = subjects.find((s) => s.id === resource.subjectId);
    if (!subject || (resource.chapterId && !subject.chapters.some((c) => c.id === resource.chapterId)))
      throw new Error(`Invalid subject/chapter reference in ${resource.id}.`);
  }
  return subjects.map((subject) => ({
    subject,
    flashcards: cards.filter((r) => r.subjectId === subject.id),
    documents: documents.filter((r) => r.subjectId === subject.id),
    tests: tests.filter((r) => r.subjectId === subject.id),
  }));
}
export function resourceContext(subject: Subject, resource: Collection | LearningDocument): ResourceContext {
  return {
    subjectId: subject.id,
    subjectName: subject.name,
    chapterId: resource.chapterId,
    chapterName: subject.chapters.find((c) => c.id === resource.chapterId)?.name,
  };
}
