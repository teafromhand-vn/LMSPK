import { useEffect, useRef, useState } from 'react';
import { BookOpen, Layers, ListChecks, ChevronRight, Search, FileText, ArrowUpRight } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Link } from '../components/Link';
import { ResourceLink } from '../components/ResourceLink';
import { Notice } from '../components/Notice';
import { useAsync } from '../hooks/useAsync';
import { loadSubject, loadDeck, resourceContext } from '../lib/content';
import { errorMessage } from '../lib/errors';
import { navigate } from '../app/router';
import { useQuiz } from '../app/QuizContext';
import { buildQuizItems, createSession } from '../quiz/engine';
import type { Collection, LearningDocument, ResourceSection, SubjectContent } from '../models/types';

export function SubjectView({
  subjectId,
  section,
  chapterId,
}: {
  subjectId: string;
  section: ResourceSection;
  chapterId?: string;
}) {
  const { data, error, reload } = useAsync(() => loadSubject(subjectId), [subjectId]);
  if (data)
    return (
      <SubjectResources
        key={`${subjectId}-${section}-${chapterId ?? ''}`}
        content={data}
        section={section}
        chapterId={chapterId}
      />
    );
  return (
    <Screen path={['subjects']} title="Môn học">
      <Link to={{ name: 'library' }}>← Tất cả môn học</Link>
      {error ? (
        <Notice title="Không thể mở môn học." tone="error">
          <p>{errorMessage(error)}</p>
          <button className="btn" onClick={reload}>
            Thử lại
          </button>
        </Notice>
      ) : (
        <p role="status">Đang tải môn học…</p>
      )}
    </Screen>
  );
}
function SubjectResources({
  content,
  section,
  chapterId,
}: {
  content: SubjectContent;
  section: ResourceSection;
  chapterId?: string;
}) {
  const { subject } = content;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [timer, setTimer] = useState<number | null>(null);
  const [selectedTest, setSelectedTest] = useState<Collection | null>(null);
  const [mode, setMode] = useState<'practice' | 'test'>('test');
  const [infinite, setInfinite] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const setup = useRef<HTMLFormElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (selectedTest) {
      setup.current?.scrollIntoView({ block: 'center' });
      setup.current?.querySelector('select')?.focus({ preventScroll: true });
    }
  }, [selectedTest]);
  const quiz = useQuiz();
  const selectedChapter = subject.chapters.find((c) => c.id === chapterId);
  const tabs = [
    { id: 'flashcards', label: 'Thẻ ghi nhớ', icon: Layers },
    { id: 'documents', label: 'Tài liệu', icon: BookOpen },
    { id: 'tests', label: 'Bài kiểm tra', icon: ListChecks },
  ] as const;
  const resources = content[section];
  const sectionLabel = tabs.find((tab) => tab.id === section)!.label.toLowerCase();
  const filtered = resources.filter(
    (r) =>
      (!chapterId || r.chapterId === chapterId) &&
      (!category || r.category === category) &&
      r.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const groups = [
    ...subject.chapters,
    { id: '', name: '' },
  ].filter((c) => (!chapterId || c.id === chapterId) && filtered.some((r) => (r.chapterId ?? '') === c.id));
  async function startTest(resource: Collection) {
    if (pending.current) return;
    pending.current = true;
    setStarting(resource.id);
    setError('');
    try {
      const deck = await loadDeck(resource.id, 'tests');
      if (!mounted.current) return;
      const pool = buildQuizItems(deck.questions);
      if (!infinite && (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > pool.length))
        throw new Error(`Nhập số câu từ 1 đến ${pool.length}.`);
      quiz.start(
        createSession({
          title: resource.name,
          deckId: resource.id,
          timer,
          mode,
          infinite,
          pool,
          context: resourceContext(subject, resource),
          items: infinite ? pool : pool.slice(0, questionCount),
        }),
      );
      navigate({ name: 'quiz', subjectId: subject.id });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      pending.current = false;
      setStarting(null);
    }
  }
  if (chapterId && !selectedChapter)
    return (
      <Screen path={['subjects']} title="Không tìm thấy chương">
        <Notice title="Không tìm thấy chương này.">
          <Link to={{ name: 'subject', subjectId: subject.id, section }}>Quay lại {subject.name}</Link>
        </Notice>
      </Screen>
    );
  return (
    <Screen path={['subjects', subject.name]} title={subject.name} sideAds>
      <nav className="breadcrumbs" aria-label="Đường dẫn">
        <Link to={{ name: 'library' }}>Môn học</Link>
        <ChevronRight size={13} />
        <span aria-current="page">{subject.name}</span>
      </nav>
      <div className={subject.chapters.length ? 'subject-layout' : ''}>
        {subject.chapters.length > 0 && <aside className="chapter-sidebar">
          <p className="page-kicker">CHƯƠNG & CHỦ ĐỀ</p>
          <Link
            to={{ name: 'subject', subjectId: subject.id, section }}
            className={!chapterId ? 'chapter-link selected' : 'chapter-link'}
            current={!chapterId}
          >
            <BookOpen size={17} />
            <span>Tất cả chương</span>
          </Link>
          {subject.chapters.map((chapter, i) => (
            <Link
              key={chapter.id}
              to={{ name: 'subject', subjectId: subject.id, section, chapterId: chapter.id }}
              className={chapterId === chapter.id ? 'chapter-link selected' : 'chapter-link'}
              current={chapterId === chapter.id}
            >
              <span className="chapter-number">{String(i + 1).padStart(2, '0')}</span>
              <span>{chapter.name}</span>
              <ChevronRight size={14} />
            </Link>
          ))}
        </aside>}
        <section className="subject-resources" aria-label="Tài nguyên môn học">
          <nav className="resource-tabs" aria-label="Các mục môn học">
            {tabs.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                to={{ name: 'subject', subjectId: subject.id, section: id, chapterId }}
                className={section === id ? 'resource-tab active' : 'resource-tab'}
                current={section === id}
              >
                <Icon size={17} />
                {label}
                <span>{content[id].filter((r) => !chapterId || r.chapterId === chapterId).length}</span>
              </Link>
            ))}
          </nav>
          <div className="subject-search resource-search">
            <div className="search-field">
              <Search size={17} />
              <input
                type="search"
                aria-label={`Tìm ${sectionLabel}`}
                placeholder={`Tìm ${sectionLabel} trong môn học…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {subject.chapters.length > 0 && <select
              aria-label="Chương"
              value={chapterId ?? ''}
              onChange={(e) =>
                navigate({
                  name: 'subject',
                  subjectId: subject.id,
                  section,
                  ...(e.target.value ? { chapterId: e.target.value } : {}),
                })
              }
            >
              <option value="">Tất cả chương</option>
              {subject.chapters.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>}
            {section === 'documents' && (
              <select aria-label="Loại tài liệu" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Tất cả loại</option>
                {[...new Set(content.documents.map((d) => d.category))].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
          {section === 'tests' && selectedTest && (
            <form ref={setup} className="quiz-setup" aria-label="Chọn chế độ kiểm tra" onSubmit={(event) => { event.preventDefault(); void startTest(selectedTest); }}>
              <h2>{selectedTest.name}</h2>
              <label>Chế độ
                <select aria-label="Chế độ" value={mode} onChange={(e) => setMode(e.target.value as 'practice' | 'test')}>
                  <option value="test">Xem đáp án sau khi kết thúc</option>
                  <option value="practice">Xem đáp án sau từng câu</option>
                </select>
              </label>
              <label><input type="checkbox" checked={infinite} onChange={(e) => setInfinite(e.target.checked)} />Vô hạn</label>
              {!infinite && <label>Số câu<input type="number" min={1} max={selectedTest.count} required value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} /></label>}
            <label className="timer-setting">
              Thời gian mỗi câu{' '}
              <select
                aria-label="Thời gian làm bài"
                value={timer ?? 'off'}
                onChange={(e) => setTimer(e.target.value === 'off' ? null : Number(e.target.value))}
              >
                <option value="off">Không giới hạn</option>
                {[10, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n} giây
                  </option>
                ))}
              </select>
            </label>
              <div><button className="btn btn-primary" type="submit" disabled={starting !== null}>Bắt đầu</button>{' '}<button className="btn" type="button" disabled={starting !== null} onClick={() => setSelectedTest(null)}>Hủy</button></div>
            </form>
          )}
          {error && (
            <Notice title="Không thể bắt đầu bài kiểm tra." tone="error">
              {error}
            </Notice>
          )}
          {groups.map((chapter) => (
            <section className="chapter-group" key={chapter.id} aria-label={chapter.name}>
              {chapter.id && <div className="chapter-group-heading">
                <span>
                  {chapter.id
                    ? String(subject.chapters.findIndex((c) => c.id === chapter.id) + 1).padStart(2, '0')
                    : '•'}
                </span>
                <div>
                  <h3>{chapter.name}</h3>
                </div>
              </div>}
              <div className="resource-list">
                {filtered
                  .filter((r) => (r.chapterId ?? '') === chapter.id)
                  .map((r) => {
                    const body = (
                      <>
                        <span className={`resource-icon ${section}`}>
                          {section === 'documents' ? (
                            <FileText size={22} />
                          ) : section === 'tests' ? (
                            <ListChecks size={22} />
                          ) : (
                            <Layers size={22} />
                          )}
                        </span>
                        <span className="resource-info">
                          <strong>{r.name}</strong>
                          <small>
                            {'format' in r
                              ? (r as LearningDocument).format.toUpperCase()
                              : `${(r as Collection).count} ${section === 'tests' ? 'câu hỏi' : 'thẻ'}`}
                          </small>
                        </span>
                        <span className="resource-open">
                          {starting === r.id
                            ? 'Đang tải…'
                            : section === 'documents'
                              ? 'Mở tab mới'
                              : section === 'tests'
                                ? 'Làm bài'
                                : 'Ôn tập'}
                          <ArrowUpRight size={16} />
                        </span>
                      </>
                    );
                    return section === 'tests' ? (
                      <button
                        className="resource-row"
                        key={r.id}
                        disabled={starting !== null}
                        onClick={() => { setSelectedTest(r as Collection); setQuestionCount((r as Collection).count); setError(''); }}
                      >
                        {body}
                      </button>
                    ) : (
                      <ResourceLink
                        key={r.id}
                        resource={r}
                        subjectId={subject.id}
                      >
                        {body}
                      </ResourceLink>
                    );
                  })}
              </div>
            </section>
          ))}
          {!filtered.length && (
            <Notice title={`Chưa có ${sectionLabel} ở đây.`}>
              <p>
                {query || category
                  ? 'Thử từ khóa hoặc loại tài liệu khác.'
                  : 'Chọn chương hoặc mục tài nguyên khác.'}
              </p>
              {(query || category) && (
                <button
                  className="btn"
                  onClick={() => {
                    setQuery('');
                    setCategory('');
                  }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </Notice>
          )}
        </section>
      </div>
    </Screen>
  );
}
