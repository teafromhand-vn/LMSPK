import type { FlashcardContent } from '../models/types';
import { shuffle, type Random } from './random';

/**
 * Memory-only review loop for a flashcard deck. The first item of `queue` is
 * the current card. Marking a card "known" removes it, while "not yet" pushes
 * it to the back so it comes up again later in the same session.
 */
export interface FlashcardQueueState {
  queue: FlashcardContent[];
  /** Card ids marked "known" at least once; a Set keeps repeat visits unique. */
  known: ReadonlySet<string>;
  /** Number of "not yet" presses, i.e. how many extra laps the learner did. */
  laps: number;
}

export function createFlashcardQueue(cards: readonly FlashcardContent[]): FlashcardQueueState {
  return { queue: cards.slice(), known: new Set(), laps: 0 };
}

/** Removes the current card from the loop and records its id once. */
export function markKnown(state: FlashcardQueueState): FlashcardQueueState {
  const [current, ...rest] = state.queue;
  if (!current) return state;
  const known = new Set(state.known);
  known.add(current.id);
  return { ...state, queue: rest, known };
}

/** Moves the current card to the end of the queue and counts the lap. */
export function markUnknown(state: FlashcardQueueState): FlashcardQueueState {
  const [current, ...rest] = state.queue;
  if (!current) return state;
  return { ...state, queue: [...rest, current], laps: state.laps + 1 };
}

/** Shuffles only the remaining cards; progress and lap count are preserved. */
export function shuffleQueue(state: FlashcardQueueState, random: Random = Math.random): FlashcardQueueState {
  return { ...state, queue: shuffle(state.queue, random) };
}
