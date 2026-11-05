import { useState } from 'react';
import { Screen } from '../components/Screen';
import { Link } from '../components/Link';
import { ResourceLink } from '../components/ResourceLink';
import { Notice } from '../components/Notice';
import { useAsync } from '../hooks/useAsync';
import { loadCatalog } from '../lib/content';
import { errorMessage } from '../lib/errors';

export function ResourcesView({ section }: { section: 'documents' | 'flashcards' }) {
  const { data, error, reload } = useAsync(loadCatalog, []);
  const [query, setQuery] = useState('');
  const title = section === 'documents' ? 'Tài liệu' : 'Thẻ ghi nhớ';
  const groups = (data ?? []).map((entry) => ({
    ...entry,
    resources: entry[section].filter((r) => `${entry.subject.name} ${entry.subject.courseId ?? ''} ${r.name} ${r.description}`.toLowerCase().includes(query.trim().toLowerCase())),
  })).filter((entry) => entry.resources.length);
  return <Screen path={[section]} title={title}>
    <div className="section-heading"><div><h1>{title}</h1><p>Khám phá tài nguyên theo môn học.</p></div></div>
    <div className="subject-search"><div className="search-field"><input type="search" aria-label={`Tìm ${title.toLowerCase()}`} placeholder="Tìm tài nguyên hoặc môn học…" value={query} onChange={(e) => setQuery(e.target.value)} /></div></div>
    {error ? <Notice title="Không thể tải tài nguyên." tone="error"><p>{errorMessage(error)}</p><button className="btn" onClick={reload}>Thử lại</button></Notice>
      : !data ? <p role="status">Đang tải tài nguyên…</p>
      : groups.length ? groups.map(({ subject, resources }) => <section className="chapter-group" key={subject.id}>
        <div className="chapter-group-heading"><h2><Link to={{ name: 'subject', subjectId: subject.id, section }}>{subject.name}</Link></h2></div>
        <div className="resource-list">{resources.map((r) => <ResourceLink key={r.id} resource={r} subjectId={subject.id}>
          <span className="resource-info"><strong>{r.name}</strong><span>{r.description}</span><small>{subject.chapters.find((c) => c.id === r.chapterId)?.name ?? 'Kiến thức chung'}</small></span>
          <span className="resource-open">{section === 'documents' ? 'Mở ↗' : 'Ôn tập →'}</span>
        </ResourceLink>)}</div>
      </section>) : <Notice title="Không tìm thấy tài nguyên."><p>Thử từ khóa khác hoặc bổ sung nội dung vào bảng tính.</p></Notice>}
  </Screen>;
}
