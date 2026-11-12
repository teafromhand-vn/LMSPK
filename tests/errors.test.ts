import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  classifyContentError,
  CONTENT_SOURCE_ERROR_MESSAGE,
  ContentDataError,
  errorMessage,
} from '../src/lib/errors';
import { parseWorkbook } from '../src/lib/sheets';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('classifyContentError', () => {
  it('replaces parse/validation details with one learner-facing message', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const technical of [
      'Tab Subjects cần có dòng tiêu đề.',
      'Tiêu đề cột của tab Questions không đúng mẫu.',
      'Chương ch1 tham chiếu môn học không tồn tại.',
      'Mã bộ câu hỏi không hợp lệ hoặc bị trùng: sql.',
      'Duplicate content id: sql',
      'Invalid subject/chapter reference in sql-notes.',
    ]) {
      expect(classifyContentError(new ContentDataError(technical))).toBe(CONTENT_SOURCE_ERROR_MESSAGE);
    }
    expect(log).toHaveBeenCalledTimes(6);
  });

  it('classifies errors thrown by parseWorkbook itself', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let caught: unknown;
    try {
      parseWorkbook({});
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ContentDataError);
    expect(classifyContentError(caught)).toBe(CONTENT_SOURCE_ERROR_MESSAGE);
  });

  it('keeps existing friendly fetchWorkbook and navigation messages intact', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const message of [
      'Không thể đọc Google Sheets (429). Đã đạt hạn mức Google Sheets; hãy thử lại sau.',
      'Không thể đọc Google Sheets (400). Kiểm tra API key và tên các tab trong bảng tính.',
      'Google Sheets phản hồi quá lâu. Vui lòng thử lại.',
      'Không thể kết nối Google Sheets. Kiểm tra mạng và thử lại.',
      'Không tìm thấy môn học này.',
      'Không tìm thấy bộ câu hỏi này.',
    ]) {
      expect(classifyContentError(new Error(message))).toBe(message);
    }
  });

  it('logs the technical error for developers without exposing it on screen', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new ContentDataError('Duplicate content id: sql');
    const shown = classifyContentError(error);
    expect(shown).not.toContain('Duplicate');
    expect(log).toHaveBeenCalledWith('[LMSPK] content error:', error);
  });

  it('falls back to the existing generic message for unknown values', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(classifyContentError(undefined)).toBe(errorMessage(undefined));
    expect(classifyContentError(null)).toBe('Đã xảy ra lỗi.');
  });
});
