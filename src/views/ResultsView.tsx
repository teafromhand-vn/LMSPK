import { useState } from 'react';
import { useQuiz } from '../app/QuizContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { navigate } from '../app/router';
import { Box } from '../components/Box';
import { Link } from '../components/Link';
import { Notice } from '../components/Notice';
import { Screen } from '../components/Screen';
import { correctAnswerText, responseText } from '../quiz/describe';
import { replaySession, summarize } from '../quiz/engine';

export function ResultsView({ subjectId }: { subjectId: string }) {
  const quiz = useQuiz();
  const session = quiz.session?.context?.subjectId === subjectId ? quiz.session : null;
  const [incorrectOnly, setIncorrectOnly] = useState(false);
  if (!session?.submitted)
    return (
      <Screen path={['tests', 'results']} title="Kết quả">
        <Notice title="Chưa có kết quả.">
          <p>Hoàn thành bài kiểm tra để xem lại đáp án. Kết quả bị xóa khi tải lại trang.</p>
          <Link to={{ name: 'subject', subjectId, section: 'tests' }}>Xem bài kiểm tra của môn học →</Link>
        </Notice>
      </Screen>
    );
  const summary = summarize(session);
  const restart = () => {
    quiz.start(replaySession(session));
    navigate({ name: 'quiz', subjectId }, { replace: true });
  };
  return (
    <Screen
      path={['tests', 'results']}
      title="Xem lại đáp án"
      actions={[
        { label: 'Làm lại', hotkey: 'r', onAction: restart, primary: true },
        {
          label: 'Tất cả bài kiểm tra',
          onAction: () => {
            quiz.end();
            navigate({ name: 'subject', subjectId, section: 'tests', chapterId: session.context?.chapterId });
          },
        },
      ]}
    >
      {session.context && <Breadcrumbs context={session.context} section="tests" title="Xem lại đáp án" />}
      <Link
        to={{ name: 'subject', subjectId, section: 'tests', chapterId: session.context?.chapterId }}
        className="back-link"
      >
        ← Bài kiểm tra của môn học
      </Link>
      <div className="view-head">
        <p className="page-kicker">HIỂU THÊM MỖI NGÀY</p>
        <h1>Xem lại đáp án của bạn</h1>
        <p>{session.title}</p>
      </div>
      <section className="result-summary" aria-label="Kết quả bài kiểm tra">
        <span className="result-percent">
          {summary.accuracy}
          <small>%</small>
        </span>
        <div>
          <h2>
            Đúng {summary.correct} / {summary.total} câu
          </h2>
          <p>{summary.score} điểm · 100 điểm cho mỗi câu đúng</p>
          <p className="dim">Mỗi lần làm bài là một cơ hội học hỏi. Kết quả này không được lưu.</p>
        </div>
        <button className="btn btn-primary" onClick={restart}>
          Làm lại
        </button>
      </section>
      <Box title="Đáp án và giải thích" className="review-box">
        <label className="review-filter">
          <input type="checkbox" checked={incorrectOnly} onChange={(e) => setIncorrectOnly(e.target.checked)} /> Chỉ xem câu trả lời sai
        </label>
        {incorrectOnly && summary.correct === summary.total && <p className="dim">Không có câu trả lời sai.</p>}
        <ol className="review-list">
          {summary.review.map(({ item, response, correct }, i) =>
            incorrectOnly && correct ? null : (
              <li key={item.question.id} className="review-card">
                <span className={correct ? 'verdict is-correct' : 'verdict is-wrong'}>
                  {correct ? '✓ Đúng' : response ? '✗ Sai' : '— Chưa trả lời'}
                </span>
                <h3>
                  {i + 1}. {item.question.prompt}
                </h3>
                <dl>
                  <dt>Câu trả lời của bạn</dt>
                  <dd>{responseText(item.question, response)}</dd>
                  <dt>Đáp án đúng</dt>
                  <dd className="is-correct">{correctAnswerText(item.question)}</dd>
                </dl>
                {item.question.explanation && <p className="explanation">{item.question.explanation}</p>}
              </li>
            ),
          )}
        </ol>
      </Box>
    </Screen>
  );
}
