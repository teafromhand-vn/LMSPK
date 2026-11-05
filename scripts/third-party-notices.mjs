import { readFile, writeFile, readdir } from 'node:fs/promises';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const sections = ['Third-party notices for Enyalië Study library\nUpstream application copyright: see LICENSE.\n'];
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev || entry.optional) continue;
  const name = path.split('node_modules/').at(-1);
  const files = (await readdir(path)).filter((name) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(name));
  sections.push(`\n${'='.repeat(70)}\n${name}@${entry.version}\nLicense: ${entry.license ?? 'See package notice'}\n`);
  for (const file of files) {
    try {
      sections.push(`${file}\n${await readFile(`${path}/${file}`, 'utf8')}\n`);
    } catch {
      /* directory named license */
    }
  }
}
await writeFile('public/THIRD-PARTY-NOTICES.txt', sections.join('\n'));
