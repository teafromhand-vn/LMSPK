import type { ReactNode } from 'react';
import type { Collection, LearningDocument } from '../models/types';
import { documentUrl } from '../lib/documentUrl';
import { Link } from './Link';

export function ResourceLink({ resource, subjectId, children }: { resource: Collection | LearningDocument; subjectId: string; children: ReactNode }) {
  return 'format' in resource
    ? <a className="resource-row" href={documentUrl(resource.file)} target="_blank" rel="noopener noreferrer" title="Mở tài liệu trong tab mới">{children}</a>
    : <Link className="resource-row" to={{ name: 'deck', subjectId, deckId: resource.id }}>{children}</Link>;
}
