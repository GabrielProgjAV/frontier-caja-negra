// seq s38: suggestion rule. Each word separates F (first in list within 2), N (closest, ties by list) and A (closest, ties alphabetical).
import { readFileSync } from 'node:fs';
import { run, v } from '../run.ts';
import { models } from '../sug-models.ts';
const words: string[] = JSON.parse(readFileSync('probe/seqs/s38-words.json', 'utf8'));
await run('s38', words.map((w): [string, string] => { const m = models(w); return [v(w), `sugerencia para ${w}: F=${m.F_primero_lista} N=${m.N_cercano_lista} A=${m.A_cercano_alfabetico}`]; }));
