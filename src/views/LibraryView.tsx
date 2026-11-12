import { useState } from 'react';
import { ArrowUpRight, BookOpen, Layers, ListChecks, Search } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Link } from '../components/Link';
import { Notice } from '../components/Notice';
import { SubjectCode } from '../components/SubjectCode';
import { useAsync } from '../hooks/useAsync';
import { loadCatalog } from '../lib/content';
import { classifyContentError } from '../lib/errors';

/** The existing library now discovers subjects rather than global tool collections. */
export function LibraryView() {
  const { data, error, reload } = useAsync(loadCatalog, []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = [...new Set((data ?? []).map(({ subject }) => subject.semester))].sort((a, b) => a - b);
  const shown = (data ?? []).filter(
    ({ subject }) =>
      (!category || String(subject.semester) === category) &&
      (subject.courseId ?? subject.id).toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <Screen path={['subjects']} title="Môn học">
      <div className="section-heading">
        <div>
          <h2>Khám phá môn học</h2>
        </div>
        <span className="count-label">{data?.length ?? 0} môn học</span>
      </div>
      <div className="subject-search">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Tìm môn học"
            type="search"
            placeholder="Tìm mã môn…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select aria-label="Học kỳ" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Tất cả học kỳ</option>
          {categories.map((c) => (
            <option key={c} value={c}>Kỳ {c}</option>
          ))}
        </select>
      </div>
      {error ? (
        <Notice title="Không thể tải danh sách môn học." tone="error">
          <p>{classifyContentError(error)}</p>
          <button className="btn" onClick={reload}>
            Thử lại
          </button>
        </Notice>
      ) : !data ? (
        <p role="status">Đang tải môn học…</p>
      ) : (
        <div className="collection-grid subject-grid">
          {shown.map(({ subject, flashcards, documents, tests }) => (
            <Link
              key={subject.id}
              to={{ name: 'subject', subjectId: subject.id, section: 'flashcards' }}
              className={`collection-card subject-card ${subject.color}`}
            >
              <div className="subject-cover">
                <span className="subject-cover-icon">
                  <SubjectCode subject={subject} />
                </span>
                <span className="subject-cover-lines" />
                <span className="subject-code">Kỳ {subject.semester}</span>
              </div>
              <div className="subject-card-body">
                <div className="subject-card-title">
                  <h3>{subject.name}</h3>
                  <ArrowUpRight size={18} />
                </div>
                <div className="resource-counts">
                  <span>
                    <Layers size={14} />
                    {flashcards.length} flashcard set
                  </span>
                  <span>
                    <BookOpen size={14} />
                    {documents.length} tài liệu
                  </span>
                  <span>
                    <ListChecks size={14} />
                    {tests.length} bài kiểm tra
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {data && !shown.length && (
        <Notice title="Không tìm thấy môn học.">
          <p>Thử từ khóa hoặc học kỳ khác.</p>
          <button
            className="btn"
            onClick={() => {
              setQuery('');
              setCategory('');
            }}
          >
            Xóa bộ lọc
          </button>
        </Notice>
      )}
    </Screen>
  );
}
