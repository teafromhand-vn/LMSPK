import { describe, expect, it } from 'vitest';
import {
  answerCurrent,
  buildQuizItems,
  createSession,
  deadline,
  isCorrect,
  moveTo,
  replaySession,
  submitSession,
  summarize,
} from '../src/quiz/engine';
import { seededRandom, shuffle } from '../src/lib/random';
import type { Question } from '../src/models/types';
const questions: Question[] = [
  { id: 'mc', type: 'multiple_choice', prompt: 'One?', choices: ['A', 'B'], correctIndex: 1, tags: [] },
  { id: 'ms', type: 'multiple_select', prompt: 'Several?', choices: ['A', 'B', 'C'], correctIndices: [0, 2], tags: [] },
  { id: 'tf', type: 'true_false', prompt: 'True?', answer: true, tags: [] },
];
const make = (timer: number | null = null) =>
  createSession({
    title: 'Test',
    deckId: 'test',
    timer,
    items: buildQuizItems(questions, { shuffleQuestions: false, shuffleChoices: false }),
  });
describe('Enyalië quiz engine: adapted original grading and session invariants', () => {
  it('preserves Fisher–Yates contents without mutating source', () => {
    const copy = structuredClone(questions);
    const result = shuffle(questions, seededRandom(5));
    expect(result).toHaveLength(3);
    expect(new Set(result.map((q) => q.id))).toEqual(new Set(['mc', 'ms', 'tf']));
    expect(questions).toEqual(copy);
    expect(result).not.toBe(questions);
  });
  it('grades MCQ and true/false, rejecting mismatched response types', () => {
    expect(isCorrect(questions[0], { type: 'multiple_choice', choice: 1 })).toBe(true);
    expect(isCorrect(questions[0], { type: 'true_false', answer: true })).toBe(false);
    expect(isCorrect(questions[2], { type: 'true_false', answer: false })).toBe(false);
  });
  it('requires exact sets for multiple select, rejecting partial/extra/duplicate choices', () => {
    for (const choices of [[0], [0, 1, 2], [0, 0, 2], []])
      expect(isCorrect(questions[1], { type: 'multiple_select', choices })).toBe(false);
    expect(isCorrect(questions[1], { type: 'multiple_select', choices: [2, 0] })).toBe(true);
  });
  it('keeps source immutable, permits untimed revision, grades unanswered as zero, freezes after submit', () => {
    const initial = make();
    let s = answerCurrent(initial, { type: 'multiple_choice', choice: 0 });
    s = answerCurrent(s, { type: 'multiple_choice', choice: 1 });
    s = submitSession(s);
    expect(initial.answers).toEqual([null, null, null]);
    expect(summarize(s)).toMatchObject({ correct: 1, total: 3, score: 100, accuracy: 33 });
    expect(answerCurrent(s, { type: 'multiple_choice', choice: 0 })).toBe(s);
  });
  it('clamps navigation and resets answers on restart while preserving timer choice', () => {
    let s = answerCurrent(make(), { type: 'multiple_choice', choice: 1 });
    expect(moveTo(s, -1).current).toBe(0);
    expect(moveTo(s, 99).current).toBe(2);
    s = submitSession(s);
    const fresh = replaySession(s);
    expect(fresh.answers).toEqual([null, null, null]);
    expect(fresh.submitted).toBe(false);
    expect(fresh.current).toBe(0);
  });
  it('enforces original timer deadline even when the browser timer fires late', () => {
    const s = make(10);
    const end = deadline(s)!;
    expect(answerCurrent(s, { type: 'timeout' }, end - 1)).toBe(s);
    expect(moveTo(s, 1)).toBe(s);
    const late = answerCurrent(s, { type: 'multiple_choice', choice: 1 }, end);
    expect(late.answers[0]).toEqual({ type: 'timeout' });
    expect(answerCurrent(late, { type: 'multiple_choice', choice: 1 }, end + 1)).toBe(late);
    expect(moveTo(late, 1).current).toBe(1);
    expect(replaySession(late).timer).toBe(10);
  });
  it('locks confirmed timed answers and keeps 100 points per correct answer without bonuses', () => {
    const s = make(20);
    const answered = answerCurrent(s, { type: 'multiple_choice', choice: 1 }, s.questionStartedAt + 1000);
    expect(answerCurrent(answered, { type: 'multiple_choice', choice: 0 })).toBe(answered);
    expect(summarize(answered).score).toBe(100);
  });
});
