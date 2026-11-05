import { expect, it } from 'vitest';
import { isDocumentUrl, documentUrl } from '../src/lib/documentUrl';
it('preserves public Google Drive links and rejects executable URLs', () => {
  const url = 'https://drive.google.com/file/d/example/view?usp=sharing';
  expect(isDocumentUrl(url)).toBe(true);
  expect(documentUrl(url)).toBe(url);
  expect(isDocumentUrl('javascript:alert(1)')).toBe(false);
  expect(() => documentUrl('javascript:alert(1)')).toThrow();
});
