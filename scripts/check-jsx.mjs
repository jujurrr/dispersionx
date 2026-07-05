// Vérifie que TOUS les fichiers .jsx compilent (preset React) — le même
// filet que celui qui aurait attrapé une balise JSX non fermée. Exécuté en CI
// avant tout déploiement, puisque le navigateur transpile sinon au runtime.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { transformSync } from '@babel/core';

function jsxFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...jsxFiles(p));
    else if (e.name.endsWith('.jsx')) out.push(p);
  }
  return out;
}

const files = jsxFiles('js');
let failed = 0;

for (const file of files) {
  try {
    transformSync(readFileSync(file, 'utf8'), {
      presets: ['@babel/preset-react'],
      filename: file,
      babelrc: false,
      configFile: false,
    });
  } catch (err) {
    failed++;
    console.error(`✗ ${file}\n  ${err.message.split('\n')[0]}`);
  }
}

if (failed) {
  console.error(`\n${failed} fichier(s) JSX en échec.`);
  process.exit(1);
}
console.log(`✓ ${files.length} fichiers JSX compilent sans erreur.`);
