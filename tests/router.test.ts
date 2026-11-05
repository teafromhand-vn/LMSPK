import { expect, it } from 'vitest';
import { depthOf, parseRoute, routeToHash, type Route } from '../src/app/router';
it('round trips supported static-host routes', () => {
  const routes: Route[] = [
    { name: 'library' },
    { name: 'deck', subjectId: 'java', deckId: 'a b' },
    { name: 'subject', subjectId: 'java', section: 'documents' },
    { name: 'subject', subjectId: 'database', section: 'tests', chapterId: 'sql' },
    { name: 'document', subjectId: 'java', documentId: 'notes' },
    { name: 'quiz', subjectId: 'java' },
    { name: 'results', subjectId: 'java' },
    { name: 'syllabus' },
  ];
  for (const route of routes) expect(parseRoute(routeToHash(route))).toEqual(route);
});
it('rejects editor routes and malformed URLs', () => {
  for (const hash of ['#/deck/a/new', '#/deck/a/q/id', '#/%zz', '#/unknown'])
    expect(parseRoute(hash)).toEqual({ name: 'notFound' });
});
it('retains navigation depth handling without learning state', () => {
  expect(depthOf(null)).toBe(0);
  expect(depthOf({ enyalieDepth: 2 })).toBe(2);
  expect(depthOf({ enyalieDepth: 'bad' })).toBe(0);
});
