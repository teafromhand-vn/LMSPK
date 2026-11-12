/**
 * A tiny hash router. Screens live at URLs like #/deck/<id>, which work on
 * any static host and give phones a working back button.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ResourceSection } from '../models/types';

export type Route =
  | { name: 'library' }
  | { name: 'documents' | 'flashcards' | 'syllabus' | 'donate' }
  | { name: 'subject'; subjectId: string; section: ResourceSection; chapterId?: string }
  | { name: 'deck'; subjectId: string; deckId: string }
  | { name: 'document'; subjectId: string; documentId: string }
  | { name: 'quizSetup'; subjectId: string; collectionId: string }
  | { name: 'quiz'; subjectId: string }
  | { name: 'results'; subjectId: string }
  | { name: 'notFound' };

function decode(part: string): string | null {
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
}

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#/, '').split('/').filter(Boolean).map(decode);
  if (parts.some((part) => part === null)) return { name: 'notFound' };
  const [first, subjectId, kind, id, chapterId] = parts as string[];
  if (parts.length === 1 && (first === 'documents' || first === 'flashcards' || first === 'syllabus' || first === 'donate')) return { name: first };
  if (parts.length === 0 || (parts.length === 1 && first === 'subjects')) return { name: 'library' };
  if (first === 'subjects' && subjectId) {
    if (parts.length === 2) return { name: 'subject', subjectId, section: 'flashcards' };
    if (
      ['flashcards', 'documents', 'tests'].includes(kind) &&
      (parts.length === 3 || (parts.length === 5 && id === 'chapter'))
    )
      return { name: 'subject', subjectId, section: kind as ResourceSection, ...(chapterId ? { chapterId } : {}) };
    if (parts.length === 4 && kind === 'deck') return { name: 'deck', subjectId, deckId: id };
    if (parts.length === 4 && kind === 'document') return { name: 'document', subjectId, documentId: id };
    if (parts.length === 4 && kind === 'quiz-setup') return { name: 'quizSetup', subjectId, collectionId: id };
    if (parts.length === 3 && (kind === 'quiz' || kind === 'results')) return { name: kind, subjectId };
  }
  return { name: 'notFound' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'library':
    case 'notFound':
      return '';
    case 'subject':
      return `#/subjects/${encodeURIComponent(route.subjectId)}/${route.section}${route.chapterId ? `/chapter/${encodeURIComponent(route.chapterId)}` : ''}`;
    case 'documents':
    case 'flashcards':
    case 'syllabus':
    case 'donate':
      return `#/${route.name}`;
    case 'deck':
      return `#/subjects/${encodeURIComponent(route.subjectId)}/deck/${encodeURIComponent(route.deckId)}`;
    case 'document':
      return `#/subjects/${encodeURIComponent(route.subjectId)}/document/${encodeURIComponent(route.documentId)}`;
    case 'quizSetup':
      return `#/subjects/${encodeURIComponent(route.subjectId)}/quiz-setup/${encodeURIComponent(route.collectionId)}`;
    case 'quiz':
      return `#/subjects/${encodeURIComponent(route.subjectId)}/quiz`;
    case 'results':
      return `#/subjects/${encodeURIComponent(route.subjectId)}/results`;
  }
}

// Each app history entry tracks how many screens are behind it.
export function depthOf(state: unknown): number {
  if (typeof state !== 'object' || state === null) return 0;
  const value = state as { enyalieDepth?: unknown };
  const depth = value.enyalieDepth;
  if (typeof depth === 'number') return depth;
  return 0;
}

const listeners = new Set<() => void>();

export function navigate(to: Route, options: { replace?: boolean } = {}): void {
  const hash = routeToHash(to) || `${window.location.pathname}${window.location.search}`;
  const depth = depthOf(window.history.state);
  if (options.replace) window.history.replaceState({ enyalieDepth: depth }, '', hash);
  else window.history.pushState({ enyalieDepth: depth + 1 }, '', hash);
  listeners.forEach((listener) => listener());
}

/**
 * Goes back like the browser's back button, unless this screen was opened
 * directly (nothing of ours to go back to), in which case it opens `fallback`.
 */
export function goBack(fallback: Route): void {
  if (depthOf(window.history.state) > 0) window.history.back();
  else navigate(fallback, { replace: true });
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onChange);
  };
}

const getHash = () => window.location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash);
  useEffect(() => {
    if (hash && parseRoute(hash).name === 'library') navigate({ name: 'library' }, { replace: true });
  }, [hash]);
  return useMemo(() => parseRoute(hash), [hash]);
}
