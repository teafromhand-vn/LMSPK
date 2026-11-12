import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Link } from '../components/Link';
import { Notice } from '../components/Notice';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useAsync } from '../hooks/useAsync';
import { loadSubject, loadDeck, resourceContext } from '../lib/content';
import { classifyContentError } from '../lib/errors';
import { navigate } from '../app/router';
import { useQuiz } from '../app/QuizContext';
import { buildQuizItems, clampQuestionCount, createSession } from '../quiz/engine';
import type { Collection, ResourceContext } from '../models/types';
import type { QuizItem } from '../quiz/engine';

interface SetupData {
  entry: Collection;
  context: ResourceContext;
  pool: QuizItem[];
}

/** Lets the learner choose length, navigation mode and time limit before a quiz starts. */
export function QuizSetupView({ subjectId, collectionId }: { subjectId: string; collectionId: string }) {
  const { data, error, reload } = useAsync<SetupData>(async () => {
    const catalog = await loadSubject(subjectId);
    const entry = catalog.tests.find((test) => test.id === collectionId);
    if (!entry) throw new Error('Không tìm thấy bài kiểm tra này.');
    const deck = await loadDeck(entry.id, 'tests');
    return {
      entry,
      context: resourceContext(catalog.subject, entry),
      pool: buildQuizItems(deck.questions),
    };
  }, [subjectId, collectionId]);

  if (data) return <SetupForm subjectId={subjectId} data={data} />;

  return (
    <Screen path={['tests']} title="Thiết lập bài kiểm tra">
      <Link to={{ name: 'subject', subjectId, section: 'tests' }}>
        <ArrowLeft size={16} /> Bài kiểm tra của môn học
      </Link>
      {error ? (
        <Notice title="Không thể mở bài kiểm tra." tone="error">
          <p>{classifyContentError(error)}</p>
          <button className="btn" onClick={reload}>
            Thử lại
          </button>
        </Notice>
      ) : (
        <p role="status">Đang tải bài kiểm tra…</p>
      )}
    </Screen>
  );
}

function SetupForm({ subjectId, data }: { subjectId: string; data: SetupData }) {
  const quiz = useQuiz();
  const { entry, context, pool } = data;
  const [count, setCount] = useState(pool.length);
  const [infinite, setInfinite] = useState(false);
  // The engine's `test` mode keeps the original sequential behaviour and
  // `practice` is the free-navigation mode.
  const [mode, setMode] = useState<'test' | 'practice'>('test');
  const [minutes, setMinutes] = useState<number | null>(null);

  function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const questionCount = clampQuestionCount(pool.length, count);
    quiz.start(
      createSession({
        title: entry.name,
        deckId: entry.id,
        timer: undefined,
        mode,
        infinite,
        pool,
        context,
        items: infinite ? pool : pool.slice(0, questionCount),
        timeLimit: minutes === null ? null : minutes * 60,
      } as Parameters<typeof createSession>[0]),
    );
    navigate({ name: 'quiz', subjectId });
  }

  return (
    <Screen path={['subjects', context.subjectName, 'tests']} title="Thiết lập bài kiểm tra">
      <Breadcrumbs context={context} section="tests" title="Thiết lập bài kiểm tra" />
      <div className="view-head">
        <p className="page-kicker">THIẾT LẬP BÀI KIỂM TRA</p>
        <h1>{entry.name}</h1>
        <p>
          {context.subjectName}
          {context.chapterName ? ` · ${context.chapterName}` : ''} · {pool.length} câu hỏi
        </p>
      </div>
      <form className="quiz-setup quiz-setup-page" aria-label="Thiết lập bài kiểm tra" onSubmit={start}>
        <fieldset className="setup-group">
          <legend>Số câu</legend>
          <div className="setup-row">
            <label htmlFor="quiz-question-count">Số câu hỏi</label>
            <input
              id="quiz-question-count"
              type="number"
              min={1}
              max={pool.length}
              required
              disabled={infinite}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
            <span className="dim">/ {pool.length}</span>
          </div>
          <label className="setup-check">
            <input type="checkbox" checked={infinite} onChange={(event) => setInfinite(event.target.checked)} />
            Vô hạn (random có lặp)
          </label>
          <p className="setup-hint">
            {infinite
              ? 'Câu hỏi được lấy ngẫu nhiên từ bộ bài, có thể lặp lại. Mỗi lượt trả lời được chấm riêng.'
              : `Mặc định làm toàn bộ ${pool.length} câu. Câu hỏi được lấy ngẫu nhiên, không lặp.`}
          </p>
        </fieldset>

        <fieldset className="setup-group">
          <legend>Chuyển câu</legend>
          <label className="setup-check">
            <input
              type="radio"
              name="quiz-mode"
              value="test"
              checked={mode === 'test'}
              onChange={() => setMode('test')}
            />
            Trả lời tuần tự
          </label>
          <label className="setup-check">
            <input
              type="radio"
              name="quiz-mode"
              value="practice"
              checked={mode === 'practice'}
              onChange={() => setMode('practice')}
            />
            Tự do chuyển câu
          </label>
        </fieldset>

        <fieldset className="setup-group">
          <legend>Thời gian</legend>
          {([
            [null, 'Không giới hạn'],
            [15, '15 phút'],
            [30, '30 phút'],
            [60, '60 phút'],
          ] as const).map(([value, label]) => (
            <label className="setup-check" key={label}>
              <input
                type="radio"
                name="quiz-time-limit"
                checked={minutes === value}
                onChange={() => setMinutes(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="setup-actions">
          <button className="btn btn-primary" type="submit">
            Bắt đầu
          </button>
          <Link to={{ name: 'subject', subjectId, section: 'tests' }} className="back-link">
            <ArrowLeft size={16} /> Chọn bộ bài khác
          </Link>
        </div>
      </form>
    </Screen>
  );
}
