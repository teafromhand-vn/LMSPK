import type { LearningDocument } from '../models/types';

/** Displays the fixed visual treatment for a document file type. */
export function DocumentFormatBadge({ document }: { document: LearningDocument }) {
  const format = document.format.toLowerCase();
  return <span className={`document-format document-format-${format}`} aria-label={`Tệp ${format.toUpperCase()}`}>{format}</span>;
}
