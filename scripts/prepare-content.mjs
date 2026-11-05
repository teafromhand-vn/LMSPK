// One-time migration of selected upstream JSON into the static content layout.
// Kept as provenance; normal content management is manual JSON editing.
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const upstream = (file) =>
  execFileSync('git', ['show', `a13be9791b52a71f603a016a9a721ab4bfa608ef:src/starter-decks/${file}`], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
const entries = [
  [
    'world-geography',
    'World geography',
    'Places, landscapes, and the connections that shape our world.',
    'Humanities',
    'Geography',
    'blue',
  ],
  [
    'chemistry-foundations',
    'Chemistry foundations',
    'Get to know atoms, elements, and the building blocks of matter.',
    'Science',
    'Chemistry',
    'purple',
  ],
  [
    'vocabulary',
    'Words worth knowing',
    'Find the right words. Explore meanings, nuances, and new expressions.',
    'Languages',
    'English',
    'amber',
  ],
  [
    'nature',
    'The natural world',
    'A closer look at living things and the remarkable world around us.',
    'Science',
    'Biology',
    'green',
  ],
  [
    'german-foundations',
    'German essentials',
    'Everyday words and simple ideas to start thinking in German.',
    'Languages',
    'German',
    'blue',
  ],
  [
    'world-facts',
    'A world of discovery',
    'Follow your curiosity through a collection of surprising world facts.',
    'Humanities',
    'General knowledge',
    'purple',
  ],
];
for (const module of ['flashcards', 'tests']) {
  await mkdir(`public/data/${module}`, { recursive: true });
  const index = [];
  for (const [id, name, description, category, subject, color] of entries) {
    const original = JSON.parse(upstream(`${id}.enyalie.json`));
    const questions = original.questions
      .filter((q) => (module === 'flashcards' ? q.type === 'flashcard' : q.type !== 'flashcard'))
      .slice(0, module === 'flashcards' ? 16 : 10)
      .map((q, i) => ({ ...q, id: `${id}-${i + 1}`, tags: q.tags ?? [] }));
    if (!questions.length) continue;
    if (id === 'chemistry-foundations' && module === 'tests')
      questions.push({
        id: 'chemistry-select',
        type: 'multiple_select',
        prompt: 'Which of these particles are found in an atomic nucleus?',
        choices: ['Protons', 'Neutrons', 'Electrons', 'Photons'],
        correctIndices: [0, 1],
        tags: ['atoms'],
        explanation:
          'The nucleus contains protons and, in most atoms, neutrons. Electrons occupy orbitals outside the nucleus.',
      });
    if (id === 'nature' && module === 'flashcards')
      questions[0].image = {
        src: 'documents/images/leaf.svg',
        alt: 'A simple diagram of a leaf and its branching veins',
      };
    const file = `data/${module}/${id}.json`;
    await writeFile(`public/${file}`, JSON.stringify({ name, description, questions }, null, 2) + '\n');
    index.push({ id, name, description, category, subject, color, file, count: questions.length });
  }
  await writeFile(`public/data/${module}/index.json`, JSON.stringify(index, null, 2) + '\n');
}
await writeFile('docs/CONTENT-SOURCES.md', upstream('SOURCES.md'));
