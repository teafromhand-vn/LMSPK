import fs from 'node:fs';
import vm from 'node:vm';

const source = process.argv[2] ?? 'C:/Users/FPT/.codex/attachments/bdc9cde9-f475-4bac-a21b-9b5c4ede1de8/Pasted text.txt';
const html = fs.readFileSync(source, 'utf8');
const extractArray = (name) => {
  const start = html.indexOf(`const ${name}`);
  if (start < 0) return [];
  const open = html.indexOf('[', start);
  const end = html.indexOf('];', open);
  return vm.runInNewContext(`(${html.slice(open, end + 1)})`);
};
const vocabulary = extractArray('VOCABULARY_DATA');
const grammar = extractArray('GRAMMAR_DATA');
const grammarTests = extractArray('GRAMMAR_TEST_QUESTIONS');
const kanaTables = (() => {
  const start = html.indexOf('const KANA_TABLES');
  const open = html.indexOf('{', start);
  const end = html.indexOf('};', open);
  return vm.runInNewContext(`(${html.slice(open, end + 1)})`);
})();
const chapters = [...new Set([...vocabulary, ...grammar, ...grammarTests].map((item) => item.chapter))].sort();
const collections = [
  ['hiragana-basic', 'jpd123', '', 'flashcards', 'Hiragana', 'Bảng chữ cái Hiragana', 'Alphabet'],
  ['katakana-basic', 'jpd123', '', 'flashcards', 'Katakana', 'Bảng chữ cái Katakana', 'Alphabet'],
  ['jpd123-vocabulary-4-7', 'jpd123', '', 'flashcards', 'Vocabulary · Chapters 4–7', 'Từ vựng chapter 4.x đến 7.x', 'Vocabulary'],
  ['jpd123-grammar-4-7', 'jpd123', '', 'flashcards', 'Grammar · Chapters 4–7', 'Ngữ pháp chapter 4.x đến 7.x', 'Grammar'],
  ['jpd123-test-vocabulary-4-7', 'jpd123', '', 'tests', 'Vocabulary test · Chapters 4–7', 'Kiểm tra từ vựng chapter 4.x đến 7.x', 'Vocabulary'],
  ['jpd123-test-grammar-4-7', 'jpd123', '', 'tests', 'Grammar test · Chapters 4–7', 'Kiểm tra ngữ pháp chapter 4.x đến 7.x', 'Grammar'],
];
const q = [];
const addCard = (collectionId, id, chapter, prompt, answer, explanation = '') => q.push([collectionId, id, 'flashcard', prompt, answer, '', '', explanation]);
for (const bank of ['hiragana', 'katakana']) {
  const values = Array.isArray(kanaTables[bank]?.basic) ? kanaTables[bank].basic : [];
  values.forEach(([jp, romaji], index) => addCard(`${bank}-basic`, `${bank}-${index + 1}`, '', jp, `${romaji ?? ''}`));
}
for (const item of vocabulary) addCard('jpd123-vocabulary-4-7', item.id, item.chapter, `${item.japanese}${item.kana ? ` (${item.kana})` : ''}`, item.meaningVi);
for (const item of grammar) addCard('jpd123-grammar-4-7', item.id, item.chapter, `${item.title}\n${item.formula}`, item.usage, item.notes?.join(' ') ?? '');
for (const item of grammarTests) {
  const choices = item.options ?? item.choices ?? [];
  const answer = item.answer ?? item.correctAnswer;
  const index = choices.indexOf(answer);
  if (index < 0) throw new Error(`Missing answer for ${item.id}`);
  q.push(['jpd123-test-grammar-4-7', item.id, 'multiple_choice', item.question, '', JSON.stringify(choices), JSON.stringify([index]), item.explanation ?? '']);
}
for (const [i, item] of vocabulary.entries()) {
  const alternatives = [...new Set(vocabulary.filter(v => v.japanese !== item.japanese && v.meaningVi !== item.meaningVi).map(v => v.meaningVi))];
  const choices = [item.meaningVi, ...alternatives.slice(i % (alternatives.length - 3), i % (alternatives.length - 3) + 3)];
  if (choices.length !== 4) throw new Error(`Not enough choices for ${item.id}`);
  q.push(['jpd123-test-vocabulary-4-7', `test-${item.id}`, 'multiple_choice', `Chọn nghĩa của từ: ${item.japanese}${item.kana ? ` (${item.kana})` : ''}`, '', JSON.stringify(choices), '[0]', `Nghĩa: ${item.meaningVi}`]);
}
const csv = (rows) => rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
fs.mkdirSync('tmp/import-jpd123', { recursive: true });
fs.writeFileSync('tmp/import-jpd123/Collections.csv', csv([['id', 'subjectId', 'chapterId', 'kind', 'name', 'description', 'category'], ...collections]));
fs.writeFileSync('tmp/import-jpd123/Questions.csv', csv([['collectionId', 'id', 'type', 'prompt', 'answer', 'choices', 'correctIndices', 'explanation'], ...q]));
console.log(JSON.stringify({ chapters, vocabulary: vocabulary.length, grammar: grammar.length, grammarTests: grammarTests.length, questions: q.length, collections: collections.length }, null, 2));
