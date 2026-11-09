/** Enyalië's pure quiz engine. Sessions live only in the React provider. */
import { shuffle, type Random } from '../lib/random';
import type { Question, ResourceContext } from '../models/types';

export interface QuizSettings {
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
}
export const DEFAULT_SETTINGS: QuizSettings = { shuffleQuestions: true, shuffleChoices: true };
export interface QuizItem {
  question: Question;
  choiceOrder: number[];
}
export function buildQuizItems(
  questions: readonly Question[],
  settings = DEFAULT_SETTINGS,
  random: Random = Math.random,
): QuizItem[] {
  const tests = questions.filter((q) => q.type !== 'flashcard');
  const ordered = settings.shuffleQuestions ? shuffle(tests, random) : tests;
  return ordered.map((question) => {
    const positions = 'choices' in question ? question.choices.map((_, i) => i) : [];
    return { question, choiceOrder: settings.shuffleChoices ? shuffle(positions, random) : positions };
  });
}
export type QuizResponse =
  | { type: 'timeout' }
  | { type: 'multiple_choice'; choice: number }
  | { type: 'multiple_select'; choices: number[] }
  | { type: 'true_false'; answer: boolean };
export function isCorrect(question: Question, response: QuizResponse): boolean {
  switch (question.type) {
    case 'multiple_choice':
      return response.type === 'multiple_choice' && response.choice === question.correctIndex;
    case 'multiple_select':
      return (
        response.type === 'multiple_select' &&
        new Set(response.choices).size === question.correctIndices.length &&
        response.choices.length === question.correctIndices.length &&
        question.correctIndices.every((index) => response.choices.includes(index))
      );
    case 'true_false':
      return response.type === 'true_false' && response.answer === question.answer;
    case 'flashcard':
      return false;
  }
}
export interface QuizSession {
  mode: 'practice' | 'test';
  infinite: boolean;
  pool: QuizItem[];
  context?: ResourceContext;
  title: string;
  deckId: string;
  items: QuizItem[];
  answers: (QuizResponse | null)[];
  current: number;
  submitted: boolean;
  timer: number | null;
  questionStartedAt: number;
}
export function createSession(params: {
  mode?: 'practice' | 'test';
  infinite?: boolean;
  pool?: QuizItem[];
  context?: ResourceContext;
  title: string;
  deckId: string;
  items: QuizItem[];
  timer?: number | null;
}): QuizSession {
  if (!params.items.length) throw new Error('A test needs at least one question.');
  return {
    ...params,
    mode: params.mode ?? 'test',
    infinite: params.infinite ?? false,
    pool: params.pool ?? params.items,
    items: params.infinite ? [params.items[Math.floor(Math.random() * params.items.length)]] : params.items,
    timer: params.timer ?? null,
    questionStartedAt: Date.now(),
    answers: params.infinite ? [null] : params.items.map(() => null),
    current: 0,
    submitted: false,
  };
}
export function currentItem(session: QuizSession): QuizItem {
  return session.items[session.current];
}
export function currentAnswer(session: QuizSession): QuizResponse | null {
  return session.answers[session.current] ?? null;
}
export function deadline(session: QuizSession): number | null {
  return session.timer === null ? null : session.questionStartedAt + session.timer * 1000;
}
export function answerCurrent(session: QuizSession, response: QuizResponse, now = Date.now()): QuizSession {
  if (session.submitted) return session;
  if ((session.timer !== null || session.mode === 'practice') && session.answers[session.current] !== null) return session;
  const end = deadline(session);
  if (response.type === 'timeout' && (end === null || now < end)) return session;
  const answers = session.answers.slice();
  answers[session.current] = end !== null && now >= end ? { type: 'timeout' } : response;
  return { ...session, answers };
}
export function moveTo(session: QuizSession, position: number, random: Random = Math.random): QuizSession {
  if (session.submitted) return session;
  if ((session.timer !== null || session.mode === 'practice' || session.infinite) && !session.answers[session.current]) return session;
  if (session.infinite && position === session.items.length) {
    const item = session.pool[Math.floor(random() * session.pool.length)];
    return { ...session, items: [...session.items, item], answers: [...session.answers, null], current: position, questionStartedAt: Date.now() };
  }
  return {
    ...session,
    current: Math.max(0, Math.min(session.items.length - 1, position)),
    questionStartedAt: Date.now(),
  };
}
export function submitSession(session: QuizSession): QuizSession {
  return { ...session, submitted: true };
}
export function summarize(session: QuizSession) {
  const review = session.items.map((item, i) => ({
    item,
    response: session.answers[i],
    correct: !!session.answers[i] && isCorrect(item.question, session.answers[i]!),
  })).filter((entry) => !session.infinite || entry.response !== null);
  const correct = review.filter((entry) => entry.correct).length;
  return {
    total: review.length,
    correct,
    score: correct * 100,
    accuracy: review.length ? Math.round((correct / review.length) * 100) : 0,
    review,
  };
}
export function replaySession(session: QuizSession, incorrectOnly = false): QuizSession {
  const source = incorrectOnly
    ? summarize(session).review.filter((entry) => !entry.correct).map((entry) => entry.item)
    : session.infinite ? session.pool : session.items;
  const questions = [...new Map(source.map((item) => [item.question.id, item.question])).values()];
  return createSession({
    context: session.context,
    title: session.title,
    deckId: session.deckId,
    timer: session.timer,
    mode: session.mode,
    infinite: !incorrectOnly && session.infinite,
    items: buildQuizItems(questions),
  });
}
