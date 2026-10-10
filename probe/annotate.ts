// Adds conclusions to experimentos.jsonl lines. Usage: node probe/annotate.ts <file.json>  ({"<id>": "conclusion"})
import { readFileSync, writeFileSync } from 'node:fs';
const c: Record<string, string> = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const L = readFileSync('experimentos.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
for (const l of L) if (c[l.id]) l.conclusion = c[l.id];
writeFileSync('experimentos.jsonl', L.map((l) => JSON.stringify(l)).join('\n') + '\n');
console.log(`annotated ${Object.keys(c).length} lines`);
