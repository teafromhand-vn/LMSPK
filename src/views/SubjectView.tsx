import { useState } from 'react';
import { BookOpen, FileText, Layers, ListChecks, ChevronRight, Search, ArrowUpRight } from 'lucide-react';
import { Screen } from '../components/Screen';
import { Link } from '../components/Link';
import { ResourceLink } from '../components/ResourceLink';
import { Notice } from '../components/Notice';
import { DocumentFormatTag } from '../components/DocumentFormatTag';
import { useAsync } from '../hooks/useAsync';
import { loadSubject } from '../lib/content';
import { classifyContentError } from '../lib/errors';
import { navigate } from '../app/router';
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
          <p>{classifyContentError(error)}</p>
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
  const [format, setFormat] = useState('');
  const selectedChapter = subject.chapters.find((c) => c.id === chapterId);
  const tabs = [
    { id: 'flashcards', label: 'Thẻ ghi nhớ', icon: Layers },
    { id: 'documents', label: 'Tài liệu', icon: BookOpen },
    { id: 'tests', label: 'Bài kiểm tra', icon: ListChecks },
  ] as const;
  const resources = content[section];
  const sectionLabel = tabs.find((tab) => tab.id === section)!.label.toLowerCase();
  const formats = [...new Set(content.documents.map((d) => d.format.toLowerCase()))].sort();
  const filtered = resources.filter(
    (r) =>
      (!chapterId || r.chapterId === chapterId) &&
      (!category || r.category === category) &&
      (section !== 'documents' || !format || (r as LearningDocument).format.toLowerCase() === format) &&
      r.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const groups = [
    ...subject.chapters,
    { id: '', name: '' },
  ].filter((c) => (!chapterId || c.id === chapterId) && filtered.some((r) => (r.chapterId ?? '') === c.id));
  if (chapterId && !selectedChapter)
    return (
      <Screen path={['subjects']} title="Không tìm thấy chương">
        <Notice title="Không tìm thấy chương này.">
          <Link to={{ name: 'subject', subjectId: subject.id, section }}>Quay lại {subject.name}</Link>
        </Notice>
      </Screen>
    );
  return (
    <Screen path={['subjects', subject.name]} title={subject.name}>
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
          <div className="resource-toolbar">
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
          </div>
          {section === 'documents' && formats.length > 0 && <div className="tag-filter" role="group" aria-label="Lọc theo định dạng tệp">
            <span className="tag-filter-label">Định dạng</span>
            <button type="button" className={`tag tag-reset${format ? '' : ' tag-active'}`} aria-pressed={!format} onClick={() => setFormat('')}>Tất cả</button>
            {formats.map((value) => <DocumentFormatTag key={value} format={value} active={format === value} onClick={() => setFormat(format === value ? '' : value)} />)}
          </div>}
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
                          <small className="resource-meta">
                           {'format' in r
                               ? <DocumentFormatTag format={(r as LearningDocument).format} />
                              : <span>{`${(r as Collection).count} ${section === 'tests' ? 'câu hỏi' : 'thẻ'}`}</span>}
                          </small>
                        </span>
                        <span className="resource-open">
                          {section === 'documents'
                            ? 'Mở tab mới'
                            : section === 'tests'
                              ? 'Làm bài'
                              : 'Ôn tập'}
                          <ArrowUpRight size={16} />
                        </span>
                      </>
                    );
                    return section === 'tests' ? (
                      <Link
                        to={{ name: 'quizSetup', subjectId: subject.id, collectionId: r.id }}
                        className="resource-row"
                        key={r.id}
                      >
                        {body}
                      </Link>
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
                {query || category || format
                  ? 'Thử từ khóa, loại tài liệu hoặc định dạng khác.'
                  : 'Chọn chương hoặc mục tài nguyên khác.'}
              </p>
              {(query || category || format) && (
                <button
                  className="btn"
                  onClick={() => {
                    setQuery('');
                    setCategory('');
                    setFormat('');
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
