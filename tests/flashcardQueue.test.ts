import { describe, expect, it } from 'vitest';
import {
  createFlashcardQueue,
  markKnown,
  markUnknown,
  shuffleQueue,
} from '../src/lib/flashcardQueue';
import { seededRandom } from '../src/lib/random';
import type { FlashcardContent } from '../src/models/types';

const card = (id: string): FlashcardContent => ({
  id,
  type: 'flashcard',
  prompt: `Prompt ${id}`,
  answer: `Answer ${id}`,
  tags: [],
});

const cards = [card('a'), card('b'), card('c')];

describe('flashcard review queue', () => {
  it('starts with every card in order and no progress', () => {
    const state = createFlashcardQueue(cards);
    expect(state.queue.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(state.known.size).toBe(0);
    expect(state.laps).toBe(0);
    expect(state.queue).not.toBe(cards);
  });

  it('marks a card known and advances to the next one', () => {
    const state = markKnown(createFlashcardQueue(cards));
    expect(state.queue.map((c) => c.id)).toEqual(['b', 'c']);
    expect([...state.known]).toEqual(['a']);
    expect(state.laps).toBe(0);
  });

  it('sends an unknown card to the back and counts a lap', () => {
    const state = markUnknown(createFlashcardQueue(cards));
    expect(state.queue.map((c) => c.id)).toEqual(['b', 'c', 'a']);
    expect(state.laps).toBe(1);
    expect(state.known.size).toBe(0);
  });

  it('keeps the known count unique when a card loops through the queue', () => {
    let state = createFlashcardQueue(cards);
    state = markUnknown(state); // b, c, a
    state = markUnknown(state); // c, a, b
    state = markKnown(state); // c, a; known = c
    state = markUnknown(state); // a, c
    state = markKnown(state); // c; known = c, a
    state = markKnown(state); // empty
    expect(state.known.size).toBe(3);
    expect(state.laps).toBe(3);
    expect(state.queue).toHaveLength(0);
  });

  it('shuffles only the remaining queue and preserves progress', () => {
    let state = markKnown(createFlashcardQueue(cards));
    state = markUnknown(state);
    const shuffled = shuffleQueue(state, seededRandom(7));
    expect([...shuffled.queue.map((c) => c.id)].sort()).toEqual(['b', 'c']);
    expect([...shuffled.known]).toEqual(['a']);
    expect(shuffled.laps).toBe(1);
  });

  it('ignores grading when the queue is empty', () => {
    const empty = createFlashcardQueue([]);
    expect(markKnown(empty)).toBe(empty);
    expect(markUnknown(empty)).toBe(empty);
    expect(shuffleQueue(empty)).toEqual(empty);
  });
});
