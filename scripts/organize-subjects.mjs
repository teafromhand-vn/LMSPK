// One-time catalog migration; resource question bodies remain unchanged.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const read = async (path) => JSON.parse(await readFile(path, 'utf8'));
const save = async (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n');
const subjects = [
  {
    id: 'database',
    name: 'Database Systems',
    description: 'From organizing data to writing your first SQL query. Build a solid relational foundation.',
    category: 'Computer science',
    color: 'blue',
    icon: 'database',
    chapters: [
      { id: 'introduction', name: 'Introduction', description: 'Data, databases, and the role of a DBMS.' },
      { id: 'relational-model', name: 'The relational model', description: 'Tables, keys, and relationships.' },
      { id: 'sql', name: 'SQL essentials', description: 'Ask useful questions of your data.' },
    ],
  },
  {
    id: 'java',
    name: 'Java Programming',
    description: 'Learn the language, understand objects, and turn small ideas into working programs.',
    category: 'Computer science',
    color: 'amber',
    icon: 'code',
    chapters: [
      { id: 'foundations', name: 'Language foundations', description: 'Types, variables, and the Java runtime.' },
      { id: 'objects', name: 'Objects & classes', description: 'Encapsulation and reusable behavior.' },
    ],
  },
  ...[
    [
      'geography',
      'Geography',
      'Explore places, landscapes, and the connections that shape our world.',
      'Humanities',
      'blue',
      'globe',
    ],
    [
      'chemistry',
      'Chemistry',
      'Understand atoms, matter, and the building blocks of the world around us.',
      'Science',
      'purple',
      'flask',
    ],
    [
      'english',
      'English Vocabulary',
      'Discover useful words, precise meanings, and better ways to express ideas.',
      'Languages',
      'amber',
      'languages',
    ],
    [
      'biology',
      'Biology',
      'Take a closer look at living things and the ecosystems they share.',
      'Science',
      'green',
      'leaf',
    ],
    [
      'german',
      'German',
      'Build confidence with everyday vocabulary and essential expressions.',
      'Languages',
      'blue',
      'languages',
    ],
    [
      'general',
      'World Knowledge',
      'Follow your curiosity through surprising facts and connected ideas.',
      'Humanities',
      'purple',
      'book',
    ],
  ].map(([id, name, description, category, color, icon]) => ({
    id,
    name,
    description,
    category,
    color,
    icon,
    chapters: [
      { id: 'foundations', name: 'Foundations', description: 'Start with the essential concepts and vocabulary.' },
    ],
  })),
];
const byResource = {
  'world-geography': 'geography',
  'chemistry-foundations': 'chemistry',
  vocabulary: 'english',
  nature: 'biology',
  'german-foundations': 'german',
  'world-facts': 'general',
};
for (const module of ['flashcards', 'tests']) {
  const path = `public/data/${module}/index.json`;
  const index = (await read(path)).filter((r) => !['database', 'java'].includes(r.subjectId));
  for (const r of index) {
    r.subjectId = byResource[r.id];
    r.chapterId = 'foundations';
  }
  await save(path, index);
}
const docs = (await read('public/data/documents/index.json')).filter(
  (r) => !['database', 'java'].includes(r.subjectId),
);
for (const d of docs) {
  d.subjectId = {
    'geography-field-notes': 'geography',
    'living-world': 'biology',
    atoms: 'chemistry',
    'vocabulary-notes': 'english',
  }[d.id];
  d.chapterId = 'foundations';
}
const topics = [
  [
    'database',
    'introduction',
    'Database fundamentals',
    [
      [
        'What is a database?',
        'An organized collection of related data.',
        'A database gives data structure so it can be stored, queried, and maintained.',
      ],
      [
        'What is a DBMS?',
        'A database management system.',
        'A DBMS provides tools to define, query, secure, and update a database.',
      ],
      [
        'What does data independence mean?',
        'Applications can be insulated from changes to data storage details.',
        'A DBMS separates logical access to data from its physical storage.',
      ],
    ],
  ],
  [
    'database',
    'relational-model',
    'Tables, keys & relationships',
    [
      [
        'What is a primary key?',
        'An attribute or set of attributes that uniquely identifies a row.',
        'A primary key is unique and cannot contain null values.',
      ],
      [
        'What is a foreign key?',
        'An attribute or set of attributes referencing a key in another or the same table.',
        'Foreign keys help enforce referential integrity.',
      ],
      [
        'What does a row represent?',
        'One record or tuple in a relation.',
        'Columns describe attributes; rows hold individual records.',
      ],
    ],
  ],
  [
    'database',
    'sql',
    'Querying with SQL',
    [
      [
        'Which clause filters rows before grouping?',
        'WHERE',
        'WHERE filters individual rows before GROUP BY is applied.',
      ],
      [
        'What does SELECT do?',
        'Retrieves data from a database.',
        'SELECT specifies the expressions or columns returned by a query.',
      ],
      [
        'What does INNER JOIN return?',
        'Rows with matching join conditions in both inputs.',
        'Rows without a match are excluded by an inner join.',
      ],
    ],
  ],
  [
    'java',
    'foundations',
    'Java language essentials',
    [
      ['What does JVM stand for?', 'Java Virtual Machine', 'The JVM executes Java bytecode.'],
      [
        'What is a primitive type?',
        'A built-in value type such as int or boolean.',
        'Primitive types are distinct from reference types such as String.',
      ],
      [
        'What does javac produce?',
        'Class files containing bytecode.',
        'The compiler translates Java source into bytecode for the JVM.',
      ],
    ],
  ],
  [
    'java',
    'objects',
    'Thinking in objects',
    [
      [
        'What is a class?',
        'A definition of the state and behavior of a kind of object.',
        'Instances are objects created from a class.',
      ],
      [
        'What is encapsulation?',
        'Bundling state and behavior while controlling access to implementation details.',
        'Private fields and public methods can provide a controlled interface.',
      ],
      [
        'What is an interface?',
        'A contract describing behavior that implementing classes provide.',
        'Interfaces allow code to depend on behavior rather than a particular implementation.',
      ],
    ],
  ],
];
for (const [subjectId, chapterId, name, facts] of topics) {
  const s = subjects.find((s) => s.id === subjectId);
  const base = `data/subjects/${subjectId}`;
  for (const module of ['flashcards', 'tests']) {
    await mkdir(`public/${base}/${module}`, { recursive: true });
    const questions =
      module === 'flashcards'
        ? facts.map(([prompt, answer, explanation], i) => ({
            id: `${chapterId}-${i}`,
            type: 'flashcard',
            prompt,
            answer,
            explanation,
            tags: [chapterId],
          }))
        : [
            {
              id: `${chapterId}-choice`,
              type: 'multiple_choice',
              prompt: facts[0][0],
              choices: [facts[0][1], 'A visual theme for an application.', 'A temporary browser preference.'],
              correctIndex: 0,
              explanation: facts[0][2],
              tags: [chapterId],
            },
            {
              id: `${chapterId}-true`,
              type: 'true_false',
              prompt: facts[1][2],
              answer: true,
              explanation: facts[1][2],
              tags: [chapterId],
            },
            {
              id: `${chapterId}-select`,
              type: 'multiple_select',
              prompt: 'Which statements are correct?',
              choices: [facts[0][2], facts[2][2], 'All information in this subject is stored only as images.'],
              correctIndices: [0, 1],
              explanation: `${facts[0][2]} ${facts[2][2]}`,
              tags: [chapterId],
            },
          ];
    const file = `${base}/${module}/${chapterId}.json`;
    await save(`public/${file}`, {
      name,
      description: s.chapters.find((c) => c.id === chapterId).description,
      questions,
    });
    const indexPath = `public/data/${module}/index.json`;
    const index = await read(indexPath);
    index.push({
      id: `${subjectId}-${chapterId}`,
      subjectId,
      chapterId,
      subject: s.name,
      name,
      description: s.chapters.find((c) => c.id === chapterId).description,
      category: 'Computer science',
      color: s.color,
      file,
      count: questions.length,
    });
    await save(indexPath, index);
  }
  await mkdir(`public/documents/${subjectId}`, { recursive: true });
  const file = `documents/${subjectId}/${chapterId}.md`;
  await writeFile(
    `public/${file}`,
    `# ${name}\n\n${s.description}\n\n` +
      facts.map(([q, a, e]) => `## ${q}\n\n**${a}**\n\n${e}`).join('\n\n') +
      '\n\n<!-- pagebreak -->\n\n# Put it into practice\n\nExplain each concept in your own words, then try the flashcards and test for this chapter.\n',
  );
  docs.push({
    id: `${subjectId}-${chapterId}-notes`,
    subjectId,
    chapterId,
    subject: s.name,
    name: `${name}: reading notes`,
    description: `A concise guide to ${name.toLowerCase()}.`,
    category: 'Study notes',
    color: s.color,
    format: 'md',
    file,
    detail: '2 sections · Study notes',
  });
}
await save('public/data/subjects.json', subjects);
await save('public/data/documents/index.json', docs);
