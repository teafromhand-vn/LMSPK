import type { DocumentFormat } from '../models/types';

/**
 * The sheet keeps a single `format` value per document; the UI presents it as
 * a tag. Interactive only when an onClick handler is supplied, so the tag can
 * also sit safely inside a link row.
 */
export function DocumentFormatTag({
  format,
  onClick,
  active = false,
}: {
  format: DocumentFormat;
  onClick?: () => void;
  active?: boolean;
}) {
  const value = String(format).toLowerCase();
  const className = `tag tag-format tag-format-${value}${active ? ' tag-active' : ''}`;
  return onClick ? (
    <button type="button" className={className} aria-pressed={active} onClick={onClick}>
      {value.toUpperCase()}
    </button>
  ) : (
    <span className={className} aria-label={`Định dạng ${value.toUpperCase()}`}>
      {value.toUpperCase()}
    </span>
  );
}
