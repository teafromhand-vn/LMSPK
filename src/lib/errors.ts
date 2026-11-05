/** Turns anything that was thrown into a message fit to show on screen. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'Đã xảy ra lỗi.';
}
