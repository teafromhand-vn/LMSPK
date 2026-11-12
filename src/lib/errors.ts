/** Friendly message shown when the source worksheet content itself is malformed. */
export const CONTENT_SOURCE_ERROR_MESSAGE =
  'Dữ liệu học liệu đang có lỗi ở nguồn (Google Sheets). Vui lòng thử lại sau ít phút. Nếu lỗi kéo dài, hãy báo cho quản trị viên.';

/** Marks errors thrown while parsing or validating worksheet content (not network/API failures). */
export class ContentDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentDataError';
  }
}

/** Turns anything that was thrown into a message fit to show on screen. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'Đã xảy ra lỗi.';
}

// Views may render their error branch more than once; log each error object only once
// so the console stays readable while still capturing every distinct failure.
const logged = new WeakSet<object>();

/**
 * Keeps friendly transport/config messages from fetchWorkbook intact, but replaces raw
 * parse/validation details (missing headers, bad references, duplicate ids) with one
 * learner-facing message. The technical error is logged for developers only.
 */
export function classifyContentError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    if (!logged.has(error)) {
      logged.add(error);
      console.error('[LMSPK] content error:', error);
    }
  } else {
    console.error('[LMSPK] content error:', error);
  }
  if (error instanceof ContentDataError) return CONTENT_SOURCE_ERROR_MESSAGE;
  return errorMessage(error);
}
