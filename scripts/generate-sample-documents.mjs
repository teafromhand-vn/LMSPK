import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document, Packer, Paragraph, HeadingLevel, PageBreak } from 'docx';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/documents/geography', { recursive: true });
await mkdir('public/documents/biology', { recursive: true });
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const pages = [
  [
    'A world in perspective',
    'Geography / Field notes',
    [
      'Geography connects places, people, and natural systems.',
      'A map is a model of the world, not the world itself.',
      '',
      'LATITUDE AND LONGITUDE',
      'Latitude measures distance north or south of the equator.',
      'Longitude measures distance east or west of the prime meridian.',
      'Both are measured in degrees.',
      '',
      'The equator is 0 degrees latitude.',
      'The prime meridian is 0 degrees longitude.',
      '',
      'Think about it: why do we need two coordinates to locate a place?',
    ],
  ],
  [
    'Reading the landscape',
    'Geography / Connections',
    [
      'Landforms develop through processes acting over time.',
      'Tectonic activity builds mountains and shapes ocean basins.',
      'Weathering breaks down rock; erosion moves the fragments.',
      '',
      'WATER SHAPES THE LAND',
      'Rivers transport sediment from higher ground toward the sea.',
      'Floodplains and deltas form where sediment is deposited.',
      '',
      'CHECK YOUR UNDERSTANDING',
      '1. What is the difference between weathering and erosion?',
      '2. What does latitude measure?',
      '',
      'Answers: breakdown versus transport; distance north or south',
      'of the equator, measured in degrees.',
    ],
  ],
];
for (let i = 0; i < pages.length; i++) {
  const [title, subtitle, lines] = pages[i];
  const page = pdf.addPage([595, 842]);
  page.drawText('ENYALIE / THE READING ROOM', { x: 55, y: 775, size: 10, font, color: rgb(0.35, 0.45, 0.65) });
  page.drawText(title, { x: 55, y: 716, size: 28, font: bold, color: rgb(0.15, 0.2, 0.28) });
  page.drawText(subtitle, { x: 55, y: 682, size: 12, font, color: rgb(0.45, 0.49, 0.56) });
  lines.forEach((line, j) =>
    page.drawText(line, { x: 55, y: 625 - j * 27, size: 12, font, color: rgb(0.22, 0.27, 0.33) }),
  );
  page.drawText(`${i + 1} / ${pages.length}`, { x: 55, y: 45, size: 10, font });
}
await writeFile('public/documents/geography/field-notes.pdf', await pdf.save());
const document = new Document({
  sections: [
    {
      children: [
        new Paragraph({ text: 'The living world', heading: HeadingLevel.TITLE }),
        new Paragraph('Biology / A short reading guide'),
        new Paragraph({ text: 'Energy and ecosystems', heading: HeadingLevel.HEADING_1 }),
        new Paragraph(
          'An ecosystem includes living organisms and the nonliving environment with which they interact. Energy moves through an ecosystem as organisms feed and grow.',
        ),
        new Paragraph({ text: 'Producers', heading: HeadingLevel.HEADING_2 }),
        new Paragraph(
          'Plants and many algae use sunlight to make sugars through photosynthesis. They form the base of many food webs.',
        ),
        new Paragraph({ text: 'Consumers', heading: HeadingLevel.HEADING_2 }),
        new Paragraph(
          'Consumers obtain energy by eating other organisms. Herbivores eat plants; carnivores eat animals; omnivores eat both.',
        ),
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ text: 'Cycles and connections', heading: HeadingLevel.HEADING_1 }),
        new Paragraph(
          'Decomposers break down dead material and return nutrients to the environment. Matter cycles through ecosystems, while energy flows through them and is eventually dissipated as heat.',
        ),
        new Paragraph({ text: 'Think it through', heading: HeadingLevel.HEADING_2 }),
        new Paragraph(
          'Why are decomposers important? Without decomposition, nutrients would remain locked in dead material and become less available to growing organisms.',
        ),
      ],
    },
  ],
});
await writeFile('public/documents/biology/living-world.docx', await Packer.toBuffer(document));
