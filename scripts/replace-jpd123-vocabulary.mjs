/**
 * Replace the JPD123 vocabulary flashcard + test decks with a curated list.
 *
 * Usage:
 *   node scripts/replace-jpd123-vocabulary.mjs            # dry run (prints summary + samples)
 *   node scripts/replace-jpd123-vocabulary.mjs --apply    # backup then rewrite Google Sheets
 *
 * Input: tab-separated file with columns: japanese, romaji, vietnamese
 *        (default scripts/data/jpd123-vocabulary.tsv). Quoted fields may contain tabs/newlines.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const apply = process.argv.includes('--apply');
const sourceFile = process.env.VOCAB_FILE ?? 'scripts/data/jpd123-vocabulary.tsv';
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID ?? '1UepauW8YimdhsUmhxCm7YUMCFZpQmz9MR_EYBmC2Q2U';
const flashcardsId = 'jpd123-vocabulary-4-7';
const testsId = 'jpd123-test-vocabulary-4-7';
const credentialsPath =
  process.env.GOOGLE_CREDENTIALS ?? path.join(process.env.USERPROFILE ?? '', '.google-credentials/service-account.json');

/** Minimal TSV parser that understands quoted fields with tabs, newlines and doubled quotes. */
function parseTsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '\t') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') field += char;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

const raw = parseTsv(fs.readFileSync(sourceFile, 'utf8'));
const entries = [];
const skipped = [];
for (const [index, cells] of raw.entries()) {
  const [rawJp = '', rawRomaji = '', rawVi = ''] = cells;
  const jp = rawJp.trim();
  const romaji = rawRomaji.trim();
  const vi = rawVi.trim();
  if (!jp) {
    skipped.push({ line: index + 1, reason: 'missing Japanese term (romaji not stored)', cells: [romaji, vi] });
    continue;
  }
  if (!vi) {
    skipped.push({ line: index + 1, reason: 'missing Vietnamese meaning', cells: [jp, romaji] });
    continue;
  }
  entries.push({ jp, romaji, vi });
}

const label = (entry) => entry.jp;

const flashcards = entries.map((entry, index) => [
  flashcardsId,
  `v${index + 1}`,
  'flashcard',
  label(entry),
  entry.vi,
  '',
  '',
  '',
]);

const tests = entries.map((entry, index) => {
  const distractors = [...new Set(entries.map((e) => e.vi))].filter((meaning) => meaning !== entry.vi);
  const start = index % Math.max(1, distractors.length - 3);
  const choices = [entry.vi, ...distractors.slice(start, start + 3)];
  if (choices.length < 4) throw new Error(`Not enough choices for ${label(entry)}`);
  return [
    testsId,
    `test-v${index + 1}`,
    'multiple_choice',
    `Chọn nghĩa của từ: ${label(entry)}`,
    '',
    JSON.stringify(choices),
    '[0]',
    `Nghĩa: ${entry.vi}`,
  ];
});

const report = {
  sourceFile,
  entries: entries.length,
  entriesWithoutJapanese: entries.filter((entry) => !entry.jp).length,
  skipped: skipped.length,
  flashcards: flashcards.length,
  testQuestions: tests.length,
};
console.log(JSON.stringify(report, null, 2));
console.log('skipped:', JSON.stringify(skipped, null, 2));
console.log('flashcard samples:', JSON.stringify(flashcards.slice(0, 5), null, 2));
console.log('test samples:', JSON.stringify(tests.slice(0, 3), null, 2));

if (!apply) {
  fs.mkdirSync('tmp/import-jpd123', { recursive: true });
  fs.writeFileSync('tmp/import-jpd123/vocabulary-preview.json', JSON.stringify({ report, skipped, flashcards, tests }, null, 2));
  console.log('\nDry run. Re-run with --apply to rewrite the spreadsheet.');
  process.exit(0);
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
const base64url = (value) => Buffer.from(value).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const claim = base64url(
  JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }),
);
const signer = crypto.createSign('RSA-SHA256');
signer.update(`${header}.${claim}`);
const assertion = `${header}.${claim}.${signer.sign(credentials.private_key, 'base64url')}`;
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
});
if (!tokenResponse.ok) throw new Error(`OAuth token failed: ${tokenResponse.status} ${await tokenResponse.text()}`);
const { access_token: accessToken } = await tokenResponse.json();
const api = async (endpoint, init = {}) => {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${endpoint}`, {
    ...init,
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json();
};

const meta = await api('?fields=sheets.properties');
const questionsSheet = meta.sheets.find((sheet) => sheet.properties.title === 'Questions');
if (!questionsSheet) throw new Error('Questions sheet not found');
const sheetId = questionsSheet.properties.sheetId;

const current = await api('/values/Questions!A:Z?valueRenderOption=UNFORMATTED_VALUE');
const values = current.values ?? [];
const headers = values[0];
if (!headers || headers[0] !== 'collectionId') throw new Error(`Unexpected Questions header: ${headers}`);
const collectionColumn = headers.indexOf('collectionId');
const targets = new Set([flashcardsId, testsId]);
const rowIndexes = values
  .map((row, index) => ({ row, index }))
  .filter(({ row, index }) => index > 0 && targets.has(String(row[collectionColumn] ?? '')))
  .map(({ index }) => index);

const backupDir = path.join('tmp', 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `questions-before-vocabulary-${Date.now()}.json`);
fs.writeFileSync(backupFile, JSON.stringify({ headers, rows: values.slice(1) }, null, 2));
console.log(`Backup written to ${backupFile} (${rowIndexes.length} vocabulary rows will be removed)`);

// Group row indexes into contiguous ranges, then delete from the bottom up.
const ranges = [];
for (const index of rowIndexes) {
  const last = ranges.at(-1);
  if (last && index === last.end + 1) last.end = index;
  else ranges.push({ start: index, end: index });
}
const requests = ranges
  .slice()
  .reverse()
  .map(({ start, end }) => ({
    deleteDimension: {
      range: { sheetId, dimension: 'ROWS', startIndex: start, endIndex: end + 1 },
    },
  }));
if (requests.length) {
  console.log(`Deleting ${rowIndexes.length} rows in ${requests.length} contiguous range(s)…`);
  await api(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests }) });
}

const ordered = [...flashcards, ...tests].map((row) =>
  headers.map((headerName) => {
    const index = [
      'collectionId',
      'id',
      'type',
      'prompt',
      'answer',
      'choices',
      'correctIndices',
      'explanation',
    ].indexOf(headerName);
    return index >= 0 ? (row[index] ?? '') : '';
  }),
);
await api('/values/Questions!A:Z:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', {
  method: 'POST',
  body: JSON.stringify({ values: ordered }),
});

const verify = await api('/values/Questions!A:Z?valueRenderOption=UNFORMATTED_VALUE');
const after = (verify.values ?? []).slice(1);
const countOf = (collectionId) => after.filter((row) => row[collectionColumn] === collectionId).length;
console.log(
  JSON.stringify(
    { applied: true, removed: rowIndexes.length, added: ordered.length, flashcards: countOf(flashcardsId), tests: countOf(testsId) },
    null,
    2,
  ),
);
