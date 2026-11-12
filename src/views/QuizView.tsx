import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useQuiz } from '../app/QuizContext';
import { navigate } from '../app/router';
import { Link } from '../components/Link';
import { Meter } from '../components/Meter';
import { Notice } from '../components/Notice';
import { Screen } from '../components/Screen';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useHotkeys, type Hotkeys } from '../hooks/useHotkeys';
import { QUESTION_TYPE_LABELS } from '../models/types';
import {
  currentAnswer,
  currentItem,
  isCorrect,
  sessionDeadline,
  type QuizItem,
  type QuizResponse,
} from '../quiz/engine';
import { correctAnswerText } from '../quiz/describe';

export function QuizView({ subjectId }: { subjectId: string }) {
  const quiz = useQuiz();
  const session = quiz.session?.context?.subjectId === subjectId ? quiz.session : null;
  const [now, setNow] = useState(Date.now());
  const end = session ? sessionDeadline(session) : null;
  const answer = session ? currentAnswer(session) : null;
  useEffect(() => {
    if (end === null || session?.submitted) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time >= end) quiz.expire();
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [end, session?.submitted, quiz.expire]);
  useEffect(() => {
    if (session?.submitted) navigate({ name: 'results', subjectId }, { replace: true });
  }, [session?.submitted, subjectId]);
  if (!session)
    return (
      <Screen path={['tests']} title="Bài kiểm tra">
        <Notice title="Sẵn sàng bắt đầu?">
          <p>Chọn bài kiểm tra để bắt đầu.</p>
          <Link to={{ name: 'subject', subjectId, section: 'tests' }}>Xem bài kiểm tra của môn học →</Link>
        </Notice>
      </Screen>
    );
  if (session.submitted) return null;
  const count = session.answers.filter((a) => a !== null).length;
  const item = currentItem(session);
  const locked = answer !== null;
  const correct = answer !== null && answer.type !== 'timeout' && isCorrect(item.question, answer);
  const canMove = (session.mode !== 'practice' && !session.infinite) || answer !== null;
  const remaining = end === null ? null : Math.max(0, end - now);
  const almostUp =
    remaining !== null && session.timeLimit !== null && remaining <= session.timeLimit * 1000 * 0.2;
  return (
    <Screen
      path={['tests', session.title]}
      title={session.title}
      actions={[
        {
          label: 'Trước',
          hotkey: 'arrowleft',
          keyLabel: '←',
          onAction: () => quiz.move(session.current - 1),
          disabled: session.current === 0 || !canMove,
        },
        {
          label: 'Tiếp',
          hotkey: 'arrowright',
          keyLabel: '→',
          onAction: () => quiz.move(session.current + 1),
          disabled: (!session.infinite && session.current === session.items.length - 1) || !canMove,
        },
        { label: session.infinite ? 'Kết thúc' : 'Nộp bài', onAction: quiz.submit, primary: true },
      ]}
    >
      {session.context && <Breadcrumbs context={session.context} section="tests" title={session.title} />}
      <Link
        to={{ name: 'subject', subjectId, section: 'tests', chapterId: session.context?.chapterId }}
        className="back-link"
      >
        ← Bài kiểm tra của môn học
      </Link>
      <div className="study-heading">
        <div>
          <h1>{session.title}</h1>
        </div>
      </div>
      <div className="quiz-layout">
        <div className="quiz-head">
          <span>
            Câu {session.current + 1} / {session.infinite ? '∞' : session.items.length}
          </span>
          <span>
            Đã trả lời {count} câu <Meter value={count} max={session.items.length} label={`Đã trả lời ${count} câu`} />
          </span>
          {remaining !== null && (
            <span
              className={`timer ${almostUp ? 'timer-warning' : ''}`}
              role="timer"
              aria-label="Thời gian còn lại"
            >
              {locked
                ? answer?.type === 'timeout'
                  ? 'Hết giờ'
                  : 'Đã khóa đáp án'
                : remaining > 0
                  ? formatClock(remaining)
                  : 'Hết giờ'}
            </span>
          )}
        </div>
        <QuestionCard
          key={`${session.deckId}-${session.current}`}
          item={item}
          response={answer}
          locked={locked}
          onAnswer={quiz.answer}
        >
          {answer && (
            <div
              className={`question-feedback ${correct ? 'feedback-correct' : 'feedback-wrong'}`}
              role="status"
              aria-live="polite"
            >
              <p className="feedback-head">
                {answer.type === 'timeout' ? (
                  <Clock size={18} aria-hidden="true" />
                ) : correct ? (
                  <CheckCircle2 size={18} aria-hidden="true" />
                ) : (
                  <XCircle size={18} aria-hidden="true" />
                )}
                <strong className={correct ? 'is-correct' : 'is-wrong'}>
                  {answer.type === 'timeout' ? 'Hết giờ' : correct ? 'Đúng' : 'Sai'}
                </strong>
              </p>
              <p>Đáp án đúng: {correctAnswerText(item.question)}</p>
              {item.question.explanation && <p className="explanation">{item.question.explanation}</p>}
            </div>
          )}
        </QuestionCard>
        <div className="question-nav" aria-label="Chuyển câu hỏi">
          {session.items.map((_, i) => (
            <button
              key={i}
              className={`question-dot ${i === session.current ? 'current' : ''} ${session.answers[i] ? 'answered' : ''}`}
              aria-label={`Câu ${i + 1}${session.answers[i] ? ', đã trả lời' : ''}`}
              aria-current={i === session.current ? 'step' : undefined}
              disabled={!canMove}
              onClick={() => quiz.move(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </Screen>
  );
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Retains the original question card, numbered answers and keyboard selection. */
function QuestionCard({
  item,
  response,
  locked,
  onAnswer,
  children,
}: {
  item: QuizItem;
  response: QuizResponse | null;
  locked: boolean;
  onAnswer: (response: QuizResponse) => void;
  children?: ReactNode;
}) {
  const { question } = item;
  const promptId = useId();
  const ref = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<QuizResponse | null>(response);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  const choices = question.type === 'true_false' ? ['Đúng', 'Sai'] : 'choices' in question ? question.choices : [];
  const order = question.type === 'true_false' ? [0, 1] : item.choiceOrder;
  const selected = draft ?? response;
  const isChosen = (choice: number) =>
    selected?.type === 'multiple_choice'
      ? selected.choice === choice
      : selected?.type === 'multiple_select'
        ? selected.choices.includes(choice)
        : selected?.type === 'true_false'
          ? selected.answer === (choice === 0)
          : false;
  const revealed = response !== null;
  const correctChoices = !revealed
    ? []
    : question.type === 'multiple_choice'
      ? [question.correctIndex]
      : question.type === 'multiple_select'
        ? question.correctIndices
        : question.type === 'true_false'
          ? [question.answer ? 0 : 1]
          : [];
  const isCorrectChoice = (choice: number) => correctChoices.includes(choice);
  const isWrongChoice = (choice: number) => revealed && isChosen(choice) && !isCorrectChoice(choice);
  function pick(choice: number) {
    if (locked) return;
    let next: QuizResponse;
    if (question.type === 'multiple_select') {
      const old = selected?.type === 'multiple_select' ? selected.choices : [];
      next = {
        type: 'multiple_select',
        choices: old.includes(choice) ? old.filter((c) => c !== choice) : [...old, choice],
      };
      setDraft(next);
    } else {
      next = question.type === 'true_false' ? { type: 'true_false', answer: choice === 0 } : { type: 'multiple_choice', choice };
      onAnswer(next);
    }
  }
  const hotkeys: Hotkeys = {};
  if (!locked)
    order.forEach((choice, i) => {
      hotkeys[String(i + 1)] = () => pick(choice);
    });
  useHotkeys(hotkeys);
  return (
    <article className="question-card" ref={ref} tabIndex={-1} aria-labelledby={promptId}>
      <span className="subject-tag">{QUESTION_TYPE_LABELS[question.type]}</span>
      <h2 className="prompt" id={promptId}>
        {question.prompt}
      </h2>
      <p className="answer-instruction">
        {question.type === 'multiple_select'
          ? 'Chọn tất cả đáp án đúng. Cần chọn đủ các đáp án đúng.'
          : 'Chọn một đáp án.'}
      </p>
      <div
        className="answers"
        role={question.type === 'multiple_select' ? 'group' : 'radiogroup'}
        aria-labelledby={promptId}
      >
        {order.map((choice, position) => (
          <button
            key={choice}
            className={`answer ${isChosen(choice) ? 'is-selected' : ''} ${isCorrectChoice(choice) ? 'is-correct' : ''} ${isWrongChoice(choice) ? 'is-wrong' : ''}`}
            role={question.type === 'multiple_select' ? 'checkbox' : 'radio'}
            aria-checked={isChosen(choice)}
            disabled={locked}
            onClick={() => pick(choice)}
          >
            <kbd className="answer-key">{position + 1}</kbd>
            <span className="answer-text">{choices[choice]}</span>
            <span className={`choice-mark ${question.type === 'multiple_select' ? 'square' : ''}`}>
              {revealed ? (isCorrectChoice(choice) ? '✓' : isWrongChoice(choice) ? '✗' : '') : isChosen(choice) ? '✓' : ''}
              {revealed && isCorrectChoice(choice) && <span className="sr-only"> (đáp án đúng)</span>}
              {isWrongChoice(choice) && <span className="sr-only"> (bạn chọn sai)</span>}
            </span>
          </button>
        ))}
      </div>
      {!locked && question.type === 'multiple_select' && (
        <button
          className="btn btn-primary confirm-answer"
          disabled={!draft || (draft.type === 'multiple_select' && !draft.choices.length)}
          onClick={() => draft && onAnswer(draft)}
        >
          Xác nhận đáp án
        </button>
      )}
      {children}
    </article>
  );
}
