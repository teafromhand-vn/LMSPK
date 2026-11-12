import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Link } from '../components/Link';
import { ResourceLink } from '../components/ResourceLink';
import { Notice } from '../components/Notice';
import { useAsync } from '../hooks/useAsync';
import { loadCatalog } from '../lib/content';
import { classifyContentError } from '../lib/errors';
import { DocumentFormatTag } from '../components/DocumentFormatTag';
import type { Collection, LearningDocument } from '../models/types';

export function ResourcesView({ section }: { section: 'documents' | 'flashcards' }) {
  const { data, error, reload } = useAsync(loadCatalog, []);
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [format, setFormat] = useState('');
  const title = section === 'documents' ? 'Tài liệu' : 'Thẻ ghi nhớ';
  const scoped = (data ?? []).filter((entry) => !subjectId || entry.subject.id === subjectId);
  const formats = [...new Set(scoped.flatMap((entry) => entry.documents.map((doc) => doc.format.toLowerCase())))].sort();
  const normalizedQuery = query.trim().toLowerCase();
  const groups = scoped
    .map((entry) => ({
      ...entry,
      resources: entry[section].filter(
        (r) =>
          r.name.toLowerCase().includes(normalizedQuery) &&
          (section !== 'documents' || !format || (r as LearningDocument).format.toLowerCase() === format),
      ),
    }))
    .filter((entry) => entry.resources.length);
  return <Screen path={[section]} title={title}>
    <div className="section-heading"><h1>{title}</h1></div>
    <div className="subject-search">
      <div className="search-field"><input type="search" aria-label={`Tìm ${title.toLowerCase()}`} placeholder={section === 'documents' ? 'Tìm tên tài liệu…' : 'Tìm flashcard set…'} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <select aria-label="Mã môn" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
        <option value="">Tất cả mã môn</option>
        {(data ?? []).map(({ subject }) => <option key={subject.id} value={subject.id}>{subject.courseId ?? subject.id.toUpperCase()}</option>)}
      </select>
    </div>
    {section === 'documents' && formats.length > 0 && <div className="tag-filter" role="group" aria-label="Lọc theo định dạng tệp">
      <span className="tag-filter-label">Định dạng</span>
      <button type="button" className={`tag tag-reset${format ? '' : ' tag-active'}`} aria-pressed={!format} onClick={() => setFormat('')}>Tất cả</button>
      {formats.map((value) => <DocumentFormatTag key={value} format={value} active={format === value} onClick={() => setFormat(format === value ? '' : value)} />)}
    </div>}
    {error ? <Notice title="Không thể tải tài nguyên." tone="error"><p>{classifyContentError(error)}</p><button className="btn" onClick={reload}>Thử lại</button></Notice>
      : !data ? <p role="status">Đang tải tài nguyên…</p>
      : groups.length ? groups.map(({ subject, resources }) => <section className="chapter-group" key={subject.id}>
        <div className="chapter-group-heading"><h2><Link to={{ name: 'subject', subjectId: subject.id, section }}>{subject.name}</Link></h2></div>
        <div className="resource-list">{resources.map((r) => {
          const doc = r as LearningDocument;
          const chapterName = subject.chapters.find((c) => c.id === r.chapterId)?.name;
          return <ResourceLink key={r.id} resource={r} subjectId={subject.id}>
            <span className="resource-icon documents"><FileText size={22} /></span>
            <span className="resource-info">
              <strong>{r.name}</strong>
              <small className="resource-meta">
                {section === 'documents'
                  ? <DocumentFormatTag format={doc.format} />
                  : <span>{(r as Collection).count} thẻ</span>}
                {chapterName && <span>· {chapterName}</span>}
              </small>
            </span>
            <span className="resource-open">{section === 'documents' ? 'Mở ↗' : 'Ôn tập →'}</span>
          </ResourceLink>;
        })}</div>
      </section>) : <Notice title="Không tìm thấy tài nguyên."><p>Thử từ khóa khác hoặc bổ sung nội dung vào bảng tính.</p></Notice>}
  </Screen>;
}
