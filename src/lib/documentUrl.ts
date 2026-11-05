/** Public document links open directly, without fetching or embedding third-party content. */
export function isDocumentUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}
export function documentUrl(file: string): string {
  if (isDocumentUrl(file)) return file;
  if (!/^documents\/[\w./-]+$/.test(file) || file.split('/').includes('..')) throw new Error('Liên kết tài liệu không hợp lệ.');
  return `${import.meta.env.BASE_URL}${file}`;
}
