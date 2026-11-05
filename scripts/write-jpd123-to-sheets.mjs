import fs from 'node:fs';
import crypto from 'node:crypto';

const credentialsPath = process.argv[2] ?? 'C:/Users/FPT/.google-credentials/service-account.json';
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID ?? '1UepauW8YimdhsUmhxCm7YUMCFZpQmz9MR_EYBmC2Q2U';
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
const base64url = (value) => Buffer.from(value).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const claim = base64url(JSON.stringify({ iss: credentials.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
const signer = crypto.createSign('RSA-SHA256');
signer.update(`${header}.${claim}`);
const assertion = `${header}.${claim}.${signer.sign(credentials.private_key, 'base64url')}`;
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
if (!tokenResponse.ok) throw new Error(`OAuth token failed: ${tokenResponse.status} ${await tokenResponse.text()}`);
const { access_token: accessToken } = await tokenResponse.json();
const api = async (path, init = {}) => { const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`, { ...init, headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', ...(init.headers ?? {}) } }); if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`); return response.json(); };
const data = await api('/values:batchGet?ranges=Collections!A:G&ranges=Questions!A:G&majorDimension=ROWS');
if (process.env.DEBUG_QUESTIONS) console.log((data.valueRanges?.[1]?.values ?? []).filter((row) => row[2] === 'flashcard' && !row[4]).map((row) => row.slice(0, 5)));
const collections = [
  ['hiragana-basic', 'jpd123', '', 'flashcards', 'Hiragana', 'Bảng chữ cái Hiragana', 'Alphabet'],
  ['katakana-basic', 'jpd123', '', 'flashcards', 'Katakana', 'Bảng chữ cái Katakana', 'Alphabet'],
  ['jpd123-vocabulary-4-7', 'jpd123', '', 'flashcards', 'Vocabulary · Chapters 4–7', 'Từ vựng chapter 4.x đến 7.x', 'Vocabulary'],
  ['jpd123-grammar-4-7', 'jpd123', '', 'flashcards', 'Grammar · Chapters 4–7', 'Ngữ pháp chapter 4.x đến 7.x', 'Grammar'],
  ['jpd123-test-vocabulary-4-7', 'jpd123', '', 'tests', 'Vocabulary test · Chapters 4–7', 'Kiểm tra từ vựng chapter 4.x đến 7.x', 'Vocabulary'],
  ['jpd123-test-grammar-4-7', 'jpd123', '', 'tests', 'Grammar test · Chapters 4–7', 'Kiểm tra ngữ pháp chapter 4.x đến 7.x', 'Grammar'],
];
const oldCollections = new Set((data.valueRanges?.[0]?.values ?? []).slice(1).map((row) => row[0]));
const newCollections = collections.filter((row) => !oldCollections.has(row[0]));
if (newCollections.length) await api('/values/Collections!A:G:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { method: 'POST', body: JSON.stringify({ values: newCollections }) });
const parseCsvLine = (line) => { const cells = []; let cell = '', quoted = false; for (let i = 0; i < line.length; i += 1) { const char = line[i]; if (char === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i += 1; } else if (char === '"') quoted = !quoted; else if (char === ',' && !quoted) { cells.push(cell); cell = ''; } else cell += char; } cells.push(cell); return cells; };
const questionFile = process.argv[3] ?? 'tmp/import-jpd123/Questions.csv';
const importedQuestions = fs.readFileSync(questionFile, 'utf8').split(/\r?\n/).filter(Boolean).slice(1).map(parseCsvLine);
const oldQuestions = new Set((data.valueRanges?.[1]?.values ?? []).slice(1).map((row) => row[1]));
const newQuestions = importedQuestions.filter((row) => !oldQuestions.has(row[1]));
if (newQuestions.length) await api('/values/Questions!A:G:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { method: 'POST', body: JSON.stringify({ values: newQuestions }) });
const allQuestionRows = data.valueRanges?.[1]?.values ?? [];
for (const id of ['hiragana-1', 'katakana-1']) {
  const index = allQuestionRows.findIndex((row) => row[1] === id);
  const source = importedQuestions.find((row) => row[1] === id);
  if (index > 0 && source) await api(`/values/Questions!D${index + 1}:G${index + 1}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: [[source[3], source[4], source[5], source[6]]] }) });
}
console.log(JSON.stringify({ serviceAccount: credentials.client_email, collectionsAdded: newCollections.length, questionsAdded: newQuestions.length, correctedKana: 2 }));
