import { useEffect, useId, useRef, useState } from 'react';
import { useQuiz } from '../app/QuizContext';
import { navigate } from '../app/router';
import { Link } from '../components/Link';
import { Meter } from '../components/Meter';
import { Notice } from '../components/Notice';
import { Screen } from '../components/Screen';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useHotkeys, type Hotkeys } from '../hooks/useHotkeys';
import { QUESTION_TYPE_LABELS } from '../models/types';
import { currentAnswer, currentItem, deadline, type QuizItem, type QuizResponse } from '../quiz/engine';

export function QuizView({ subjectId }: { subjectId: string }) {
  const quiz = useQuiz();
  const session = quiz.session?.context?.subjectId === subjectId ? quiz.session : null;
  const [now, setNow] = useState(Date.now());
  const end = session && deadline(session);
  const answer = session ? currentAnswer(session) : null;
  useEffect(() => {
    if (end === null || end === undefined || answer || session?.submitted) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time >= end) quiz.answer({ type: 'timeout' });
    };
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [end, answer, session?.submitted, quiz.answer]);
  useEffect(() => {
    if (session?.submitted) navigate({ name: 'results', subjectId }, { replace: true });
  }, [session?.submitted, subjectId]);
  if (!session)
    return (
      <Screen path={['tests']} title="Bài kiểm tra">
        <Notice title="Sẵn sàng bắt đầu?">
          <p>Chọn bài kiểm tra để bắt đầu. Tải lại trang sẽ xóa mọi câu trả lời.</p>
          <Link to={{ name: 'subject', subjectId, section: 'tests' }}>Xem bài kiểm tra của môn học →</Link>
        </Notice>
      </Screen>
    );
  if (session.submitted) return null;
  const count = session.answers.filter((a) => a !== null).length;
  const locked = session.timer !== null && answer !== null;
  const canMove = session.timer === null || answer !== null;
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
          disabled: session.current === session.items.length - 1 || !canMove,
        },
        { label: 'Nộp bài', onAction: quiz.submit, primary: true },
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
          <p className="page-kicker">CÙNG SUY NGHĨ</p>
          <h1>{session.title}</h1>
          <p>Chọn đáp án và nộp bài để xem giải thích chi tiết.</p>
        </div>
      </div>
      <div className="quiz-layout">
        <div className="quiz-head">
          <span>
            Câu {session.current + 1} / {session.items.length}
          </span>
          <span>
            Đã trả lời {count} câu <Meter value={count} max={session.items.length} label={`Đã trả lời ${count} câu`} />
          </span>
          {end !== null && (
            <span className="timer" role="timer" aria-label="Thời gian còn lại">
              {locked
                ? answer?.type === 'timeout'
                  ? 'Hết giờ'
                  : 'Đã khóa đáp án'
                : `Còn ${Math.max(0, Math.ceil((end - now) / 1000))} giây`}
            </span>
          )}
        </div>
        <QuestionCard
          key={`${session.deckId}-${session.current}`}
          item={currentItem(session)}
          response={answer}
          locked={locked}
          timed={session.timer !== null}
          onAnswer={quiz.answer}
        />
        <div className="question-nav" aria-label="Chuyển câu hỏi">
          {session.items.map((item, i) => (
            <button
              key={item.question.id}
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
        <p className="study-note">Câu chưa trả lời được 0 điểm. Kết quả chỉ tồn tại trong phiên hiện tại.</p>
      </div>
    </Screen>
  );
}

/** Retains the original question card, numbered answers and keyboard selection. */
function QuestionCard({
  item,
  response,
  locked,
  timed,
  onAnswer,
}: {
  item: QuizItem;
  response: QuizResponse | null;
  locked: boolean;
  timed: boolean;
  onAnswer: (response: QuizResponse) => void;
}) {
  const { question } = item;
  const promptId = useId();
  const ref = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<QuizResponse | null>(response);
  const selected = timed ? draft : response;
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  const choices = question.type === 'true_false' ? ['Đúng', 'Sai'] : 'choices' in question ? question.choices : [];
  const order = question.type === 'true_false' ? [0, 1] : item.choiceOrder;
  const isChosen = (choice: number) =>
    selected?.type === 'multiple_choice'
      ? selected.choice === choice
      : selected?.type === 'multiple_select'
        ? selected.choices.includes(choice)
        : selected?.type === 'true_false'
          ? selected.answer === (choice === 0)
          : false;
  function pick(choice: number) {
    if (locked) return;
    let next: QuizResponse;
    if (question.type === 'multiple_select') {
      const old = selected?.type === 'multiple_select' ? selected.choices : [];
      next = {
        type: 'multiple_select',
        choices: old.includes(choice) ? old.filter((c) => c !== choice) : [...old, choice],
      };
    } else if (question.type === 'true_false') next = { type: 'true_false', answer: choice === 0 };
    else next = { type: 'multiple_choice', choice };
    if (timed) setDraft(next);
    else onAnswer(next);
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
            className={`answer ${isChosen(choice) ? 'is-selected' : ''}`}
            role={question.type === 'multiple_select' ? 'checkbox' : 'radio'}
            aria-checked={isChosen(choice)}
            disabled={locked}
            onClick={() => pick(choice)}
          >
            <kbd className="answer-key">{position + 1}</kbd>
            <span className="answer-text">{choices[choice]}</span>
            <span className={`choice-mark ${question.type === 'multiple_select' ? 'square' : ''}`}>
              {isChosen(choice) ? '✓' : ''}
            </span>
          </button>
        ))}
      </div>
      {timed && (
        <button
          className="btn btn-primary confirm-answer"
          disabled={locked || !draft || (draft.type === 'multiple_select' && !draft.choices.length)}
          onClick={() => draft && onAnswer(draft)}
        >
          Xác nhận đáp án
        </button>
      )}
      {response?.type === 'timeout' && (
        <p role="status" className="is-wrong">
          Hết giờ. Tiếp tục đến câu hỏi tiếp theo.
        </p>
      )}
    </article>
  );
}
