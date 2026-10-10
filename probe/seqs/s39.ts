// seq s39: tie ANULA vs HALT separates "alphabetical" (ANULA) from "shortest" (HALT)
import { run, v } from '../run.ts';
await run('s39', ['HULA', 'NULT', 'HNLA'].map((w): [string, string] => [v(w), `desempate ${w}: empate ANULA/HALT a la misma distancia; alfabético -> ANULA, más corto -> HALT`]));
