import type { Collection, Deck, LearningDocument, SubjectContent, Syllabus } from '../models/types';
import { assembleCatalog, validateDeck, validateIndex, validateSubjects } from './contentValidation';

export const SHEET_NAMES = ['Subjects', 'Chapters', 'Collections', 'Questions', 'Documents'] as const;
type SheetName = (typeof SHEET_NAMES)[number];
export interface SheetContent {
  catalog: SubjectContent[];
  decks: Map<string, Deck>;
  syllabus: Syllabus[];
}
export interface SheetsConfig {
  spreadsheetId: string;
  apiKey: string;
}
type Row = Record<string, string>;
const headers: Record<SheetName, string[]> = {
  Subjects: ['id', 'courseId', 'name', 'semester', 'category', 'color'],
  Chapters: ['subjectId', 'id', 'name'],
  Collections: ['id', 'subjectId', 'chapterId', 'kind', 'name', 'category'],
  Questions: [
    'collectionId',
    'id',
    'type',
    'prompt',
    'answer',
    'choices',
    'correctIndices',
  ],
  Documents: ['id', 'subjectId', 'chapterId', 'name', 'category', 'format', 'file'],
};

/** Anonymous GET only. No OAuth, credentials, proxy, service account or write endpoint. */
export async function fetchWorkbook(config: SheetsConfig, request: typeof fetch = fetch): Promise<unknown> {
  const id = config.spreadsheetId.trim();
  const key = config.apiKey.trim();
  if (!id || !key)
    throw new Error('Chưa cấu hình Google Sheets. Điền VITE_GOOGLE_SPREADSHEET_ID và VITE_GOOGLE_API_KEY theo README.');
  if (!/^[\w-]+$/.test(id)) throw new Error('Spreadsheet ID không hợp lệ. Chỉ nhập ID, không nhập toàn bộ URL.');
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchGet`);
  for (const name of SHEET_NAMES) url.searchParams.append('ranges', `'${name}'!A:Z`);
  url.searchParams.set('key', key);
  url.searchParams.set('valueRenderOption', 'UNFORMATTED_VALUE');
  url.searchParams.set('majorDimension', 'ROWS');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await request(url.href, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      const help =
        response.status === 429
          ? 'Đã đạt hạn mức Google Sheets; hãy thử lại sau.'
          : response.status === 400
            ? 'Kiểm tra API key và tên các tab trong bảng tính.'
            : 'Kiểm tra Spreadsheet ID, quyền xem công khai và việc bật Google Sheets API.';
      throw new Error(`Không thể đọc Google Sheets (${response.status}). ${help}`);
    }
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Google Sheets phản hồi quá lâu. Vui lòng thử lại.');
    if (error instanceof TypeError) throw new Error('Không thể kết nối Google Sheets. Kiểm tra mạng và thử lại.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function table(value: unknown, name: SheetName): Row[] {
  if (!object(value) || !Array.isArray(value.values) || !Array.isArray(value.values[0]))
    throw new Error(`Tab ${name} cần có dòng tiêu đề.`);
  const cells = value.values[0].map((cell: unknown) => String(cell).trim());
  if (new Set(cells).size !== cells.length || headers[name].some((h) => !cells.includes(h)))
    throw new Error(`Tiêu đề cột của tab ${name} không đúng mẫu.`);
  return value.values
    .slice(1)
    .filter((row: unknown) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim()))
    .map((row: unknown[]) =>
      Object.fromEntries(cells.flatMap((header: string, i: number) =>
        header === 'description' || header === 'detail' ? [] : [[header, String(row[i] ?? '').trim()]])),
    );
}
function integer(value: string, field: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`${field} phải là số nguyên không âm.`);
  return Number(value);
}
function array(value: string, field: string): unknown[] {
  try {
    const result: unknown = JSON.parse(value);
    if (Array.isArray(result)) return result;
  } catch {
    /* reported below */
  }
  throw new Error(`${field} phải là mảng JSON, ví dụ ["A","B"].`);
}

/** Convert public worksheet rows into Enyalië's existing engine model. */
export function parseWorkbook(payload: unknown): SheetContent {
  if (!object(payload) || !Array.isArray(payload.valueRanges) || payload.valueRanges.length !== SHEET_NAMES.length)
    throw new Error('Google Sheets phải trả về đủ 5 tab theo mẫu.');
  const ranges = payload.valueRanges;
  const tables = Object.fromEntries(SHEET_NAMES.map((name, i) => [name, table(ranges[i], name)])) as Record<
    SheetName,
    Row[]
  >;
  const subjects = validateSubjects(
    tables.Subjects.map((s) => ({
      ...s,
      courseId: s.courseId || undefined,
      semester: integer(s.semester, `${s.id}.semester`),
      icon: 'book',
      chapters: tables.Chapters.filter((c) => c.subjectId === s.id).map(({ id, name }) => ({
        id,
        name,
      })),
    })),
  );
  for (const chapter of tables.Chapters)
    if (!subjects.some((s) => s.id === chapter.subjectId))
      throw new Error(`Chương ${chapter.id} tham chiếu môn học không tồn tại.`);
  const decks = new Map<string, Deck>();
  const ids = new Set<string>();
  const cards: Collection[] = [],
    tests: Collection[] = [];
  for (const c of tables.Collections) {
    if (!/^[a-z0-9-]+$/.test(c.id) || ids.has(c.id))
      throw new Error(`Mã bộ câu hỏi không hợp lệ hoặc bị trùng: ${c.id}`);
    ids.add(c.id);
    if (c.kind !== 'flashcards' && c.kind !== 'tests')
      throw new Error(`kind của ${c.id} phải là flashcards hoặc tests.`);
    const questions = tables.Questions.filter((q) => q.collectionId === c.id).map((q) => {
      const base = { id: q.id, type: q.type, prompt: q.prompt, explanation: q.explanation, tags: [] };
      if (q.type === 'flashcard')
        return {
          ...base,
          answer: q.answer,
          ...(q.image ? { image: { src: q.image, alt: q.imageAlt } } : {}),
          ...(q.backImage ? { backImage: { src: q.backImage, alt: q.backImageAlt } } : {}),
        };
      if (q.type === 'true_false') {
        if (!/^(true|false)$/i.test(q.answer)) throw new Error(`Đáp án của ${q.id} phải là TRUE hoặc FALSE.`);
        return { ...base, answer: q.answer.toLowerCase() === 'true' };
      }
      const indices = array(q.correctIndices, `${q.id}.correctIndices`);
      if (q.type === 'multiple_choice' && indices.length !== 1) throw new Error(`${q.id} cần đúng một đáp án.`);
      return {
        ...base,
        choices: array(q.choices, `${q.id}.choices`),
        ...(q.type === 'multiple_choice' ? { correctIndex: indices[0] } : { correctIndices: indices }),
      };
    });
    const deck = validateDeck({ name: c.name, questions }, c.kind);
    const subject = subjects.find((s) => s.id === c.subjectId);
    const entry = {
      ...c,
      chapterId: c.chapterId || undefined,
      subject: subject?.name ?? '',
      color: subject?.color,
      count: deck.questions.length,
    };
    const valid = validateIndex([entry]) as Collection[];
    (c.kind === 'flashcards' ? cards : tests).push(valid[0]);
    decks.set(`${c.kind}/${c.id}`, deck);
  }
  // A sheet can retain questions from a collection that was removed or renamed.
  // Those stale rows must not make the whole library unavailable: they are not
  // included in any deck above because questions are selected by collection ID.
  // Keep the validation for collection rows themselves, but safely ignore these
  // orphan question rows so the remaining subjects can still be loaded.
  const documents = validateIndex(
    tables.Documents.map((d) => {
      if (!/^[a-z0-9-]+$/.test(d.id)) throw new Error(`Mã tài liệu không hợp lệ: ${d.id}`);
      const subject = subjects.find((s) => s.id === d.subjectId);
      return { ...d, chapterId: d.chapterId || undefined, subject: subject?.name ?? '', color: subject?.color };
    }),
    true,
  ) as LearningDocument[];
  return { catalog: assembleCatalog(subjects, cards, documents, tests), decks, syllabus: [] };
}
