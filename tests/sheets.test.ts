import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWorkbook, parseWorkbook, SHEET_NAMES } from '../src/lib/sheets';
import { fixtureWorkbook } from './fixtures/workbook';

// CSV fixture reader supporting quoted commas, doubled quotes and multiline cells.
function csv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(cell.replace(/\r$/, ''));
      cell = '';
      if (c === '\n') {
        rows.push(row);
        row = [];
      }
    } else cell += c;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}
const template = () => ({
  valueRanges: SHEET_NAMES.map((name) => ({
    values: csv(readFileSync(`templates/google-sheets/${name}.csv`, 'utf8')),
  })),
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe('public Google Sheets', () => {
  it('reads the actual distributable template and every supported question type', () => {
    const result = parseWorkbook(template());
    expect(result.catalog.map((c) => c.subject.semester)).toEqual([3, 2]);
    expect(result.catalog[0].flashcards[0].count).toBe(1);
    expect(result.catalog[0].tests[0].count).toBe(2);
    expect(result.catalog[0].documents[0].file).toBe('documents/template/database.md');
    expect(result.decks.get('tests/database-test')?.questions[1]).toMatchObject({ answer: false });
    expect(result.decks.get('tests/java-test')?.questions[0]).toMatchObject({ correctIndices: [0, 1] });
    expect(parseWorkbook(fixtureWorkbook()).catalog).toHaveLength(8);
  });
  it('accepts empty optional tabs, empty trailing cells and blank rows', () => {
    const payload = template();
    payload.valueRanges[4].values = [payload.valueRanges[4].values[0], []];
    payload.valueRanges[3].values[1] = payload.valueRanges[3].values[1].slice(0, 8);
    expect(parseWorkbook(payload).catalog[0].documents).toEqual([]);
  });
  it('rejects missing headers, orphan rows, duplicate IDs, invalid semesters and answers', () => {
    for (const mutate of [
      (p: ReturnType<typeof template>) => {
        p.valueRanges[0].values[0][0] = 'wrong';
      },
      (p: ReturnType<typeof template>) => {
        p.valueRanges[1].values[1][0] = 'missing';
      },
      (p: ReturnType<typeof template>) => {
        p.valueRanges[2].values[2][0] = p.valueRanges[2].values[1][0];
      },
      (p: ReturnType<typeof template>) => {
        p.valueRanges[0].values[1][p.valueRanges[0].values[0].indexOf('semester')] = '0';
      },
      (p: ReturnType<typeof template>) => {
        p.valueRanges[3].values[1][0] = 'missing';
      },
      (p: ReturnType<typeof template>) => {
        p.valueRanges[3].values[2][6] = '[99]';
      },
      (p: ReturnType<typeof template>) => {
        p.valueRanges[3].values[3][4] = 'maybe';
      },
      (p: ReturnType<typeof template>) => {
        p.valueRanges[2].values[1][2] = 'missing';
      },
    ]) {
      const payload = template();
      mutate(payload);
      expect(() => parseWorkbook(payload)).toThrow();
    }
  });
  it('uses one anonymous GET with five ranges and never sends a body', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(template())));
    await fetchWorkbook({ spreadsheetId: 'public-id', apiKey: 'public-key' }, request);
    const [url, options] = request.mock.calls[0];
    expect(new URL(String(url)).searchParams.getAll('ranges')).toHaveLength(5);
    expect(options).toMatchObject({ method: 'GET', credentials: 'omit', cache: 'no-store' });
    expect(options?.body).toBeUndefined();
    expect(options?.headers).toBeUndefined();
  });
  it('ignores legacy descriptions and does not require a Syllabus tab', () => {
    const result = parseWorkbook(fixtureWorkbook());
    expect(result.catalog[0].subject).not.toHaveProperty('description');
    expect(result.catalog[0].flashcards[0]).not.toHaveProperty('description');
    expect(result.catalog[0].documents[0]).not.toHaveProperty('detail');
    expect(result.syllabus).toEqual([]);
    expect(SHEET_NAMES).not.toContain('Syllabus');
  });
  it('reports missing configuration, permissions and quota failures', async () => {
    const request = vi.fn<typeof fetch>();
    await expect(fetchWorkbook({ spreadsheetId: '', apiKey: '' }, request)).rejects.toThrow('Chưa cấu hình');
    expect(request).not.toHaveBeenCalled();
    for (const status of [400, 403, 404, 429, 500]) {
      request.mockResolvedValueOnce(new Response('', { status }));
      await expect(fetchWorkbook({ spreadsheetId: 'id', apiKey: 'key' }, request)).rejects.toThrow(String(status));
    }
  });
  it('deduplicates content requests and evicts failures so retry can recover', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_GOOGLE_SPREADSHEET_ID', 'test-id');
    vi.stubEnv('VITE_GOOGLE_API_KEY', 'test-key');
    const request = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValue(new Response(JSON.stringify(template())));
    const { loadCatalog, loadDeck } = await import('../src/lib/content');
    await expect(loadCatalog()).rejects.toThrow('503');
    const [catalog, same] = await Promise.all([loadCatalog(), loadCatalog()]);
    expect(catalog).toBe(same);
    expect((await loadDeck('database-test', 'tests')).questions).toHaveLength(2);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
