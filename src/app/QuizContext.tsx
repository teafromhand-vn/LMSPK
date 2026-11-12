/** Shared test state: deliberately initialized empty on every page load. */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { answerCurrent, finalizeExpired, moveTo, submitSession, type QuizResponse, type QuizSession } from '../quiz/engine';
interface QuizApi {
  session: QuizSession | null;
  start: (session: QuizSession) => void;
  answer: (response: QuizResponse) => void;
  move: (position: number) => void;
  submit: () => void;
  expire: () => void;
  end: () => void;
}
const QuizContext = createContext<QuizApi | null>(null);
export function QuizProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<QuizSession | null>(null);
  return (
    <QuizContext.Provider
      value={{
        session,
        start: setSession,
        answer: (response) => setSession((s) => (s ? answerCurrent(s, response) : s)),
        move: (position) => setSession((s) => (s ? moveTo(s, position) : s)),
        submit: () => setSession((s) => (s ? submitSession(s) : s)),
        expire: () => setSession((s) => (s ? finalizeExpired(s) : s)),
        end: () => setSession(null),
      }}
    >
      {children}
    </QuizContext.Provider>
  );
}
export function useQuiz(): QuizApi {
  const api = useContext(QuizContext);
  if (!api) throw new Error('useQuiz() must be used inside <QuizProvider>.');
  return api;
}
