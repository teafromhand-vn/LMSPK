import { documentUrl } from '../lib/documentUrl';
import { Screen } from '../components/Screen';
import { Link } from '../components/Link';
import { Notice } from '../components/Notice';
import { useAsync } from '../hooks/useAsync';
import { loadSubject, resourceContext } from '../lib/content';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { classifyContentError } from '../lib/errors';
export function DocumentView({ documentId, subjectId }: { documentId: string; subjectId: string }) {
  const { data, error, reload } = useAsync(async () => {
    const catalog = await loadSubject(subjectId);
    const doc = catalog.documents.find((d) => d.id === documentId);
    if (!doc) throw new Error('Không tìm thấy tài liệu này.');
    return { ...doc, context: resourceContext(catalog.subject, doc) };
  }, [documentId, subjectId]);
  return (
    <Screen path={['documents']} title={data?.name ?? 'Tài liệu'}>
      {data && <Breadcrumbs context={data.context} section="documents" title={data.name} />}
      <Link to={{ name: 'subject', subjectId, section: 'documents', chapterId: data?.chapterId }} className="back-link">
        ← Tài liệu của môn học
      </Link>
      {error ? (
        <Notice title="Không thể mở tài liệu." tone="error">
          <p>{classifyContentError(error)}</p>
          <button className="btn" onClick={reload}>
            Thử lại
          </button>
        </Notice>
      ) : !data ? (
        <p role="status">Đang tải tài liệu…</p>
      ) : (
        <>
          <div className="reader-heading">
            <p className="page-kicker">
              {data.subject} / {data.format.toUpperCase()}
            </p>
            <h1>{data.name}</h1>
          </div>
          <a className="btn btn-primary" href={documentUrl(data.file)} target="_blank" rel="noopener noreferrer">Mở tài liệu trong tab mới ↗</a>
        </>
      )}
    </Screen>
  );
}
