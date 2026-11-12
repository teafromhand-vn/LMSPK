import { useState } from 'react';
import { Screen } from '../components/Screen';
import { Link } from '../components/Link';
import { ResourceLink } from '../components/ResourceLink';
import { Notice } from '../components/Notice';
import { useAsync } from '../hooks/useAsync';
import { loadCatalog } from '../lib/content';
import { classifyContentError } from '../lib/errors';

export function ResourcesView({ section }: { section: 'documents' | 'flashcards' }) {
  const { data, error, reload } = useAsync(loadCatalog, []);
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const title = section === 'documents' ? 'Tài liệu' : 'Thẻ ghi nhớ';
  const groups = (data ?? []).filter((entry) => !subjectId || entry.subject.id === subjectId).map((entry) => ({
    ...entry,
    resources: entry[section].filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase())),
  })).filter((entry) => entry.resources.length);
  return <Screen path={[section]} title={title}>
    <div className="section-heading"><h1>{title}</h1></div>
    <div className="subject-search">
      <div className="search-field"><input type="search" aria-label={`Tìm ${title.toLowerCase()}`} placeholder={section === 'documents' ? 'Tìm tên tài liệu…' : 'Tìm flashcard set…'} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <select aria-label="Mã môn" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
        <option value="">Tất cả mã môn</option>
        {(data ?? []).map(({ subject }) => <option key={subject.id} value={subject.id}>{subject.courseId ?? subject.id.toUpperCase()}</option>)}
      </select>
    </div>
    {error ? <Notice title="Không thể tải tài nguyên." tone="error"><p>{classifyContentError(error)}</p><button className="btn" onClick={reload}>Thử lại</button></Notice>
      : !data ? <p role="status">Đang tải tài nguyên…</p>
      : groups.length ? groups.map(({ subject, resources }) => <section className="chapter-group" key={subject.id}>
        <div className="chapter-group-heading"><h2><Link to={{ name: 'subject', subjectId: subject.id, section }}>{subject.name}</Link></h2></div>
        <div className="resource-list">{resources.map((r) => <ResourceLink key={r.id} resource={r} subjectId={subject.id}>
          <span className="resource-info"><strong>{r.name}</strong><small>{subject.chapters.find((c) => c.id === r.chapterId)?.name}</small></span>
          <span className="resource-open">{section === 'documents' ? 'Mở ↗' : 'Ôn tập →'}</span>
        </ResourceLink>)}</div>
      </section>) : <Notice title="Không tìm thấy tài nguyên."><p>Thử từ khóa khác hoặc bổ sung nội dung vào bảng tính.</p></Notice>}
  </Screen>;
}
