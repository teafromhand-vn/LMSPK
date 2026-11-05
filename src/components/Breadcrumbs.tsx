import { ChevronRight } from 'lucide-react';
import { Link } from './Link';
import type { ResourceContext, ResourceSection } from '../models/types';
export function Breadcrumbs({
  context,
  section,
  title,
}: {
  context: ResourceContext;
  section: ResourceSection;
  title?: string;
}) {
  return (
    <nav className="breadcrumbs" aria-label="Đường dẫn">
      <Link to={{ name: 'library' }}>Môn học</Link>
      <ChevronRight size={13} />
      <Link to={{ name: 'subject', subjectId: context.subjectId, section }}>{context.subjectName}</Link>
      {context.chapterId && (
        <>
          <ChevronRight size={13} />
          <Link to={{ name: 'subject', subjectId: context.subjectId, section, chapterId: context.chapterId }}>
            {context.chapterName ?? context.chapterId}
          </Link>
        </>
      )}
      {title && (
        <>
          <ChevronRight size={13} />
          <span aria-current="page">{title}</span>
        </>
      )}
    </nav>
  );
}
