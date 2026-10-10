// seq s37: accents / ñ in the control. Candidates from rival hypotheses first (H1 ignore, H2 strip accent, H3a latin1, H3b ñ=15), oracle fallback.
import { send } from '../send.ts';
import { oracle } from '../oracle.ts';
import { variants } from '../ctrl-variants.ts';
const seq = 's37';
await send(seq, { hipotesis: 'reset: inicio de secuencia', path: '/__reset' });
const msgs = ['ALTA;José', 'ALTA;Lucía', 'ALTA;Muñoz', 'ALTA;Ángela', 'ALTA;Güell', 'ALTA;JOSÉ', 'ALTA;MUÑOZ', 'ALTA;Ñ', 'ALTA;é', 'CONSULTÁ;AC-0001', 'CÓNSULTA;AC-0001', 'CONSULTA;AC-000É'];
for (const m of msgs) {
  const v = variants(m);
  const hints = [...new Set(Object.values(v))];
  const r = await oracle(seq, m, hints);
  const which = Object.entries(v).filter(([, c]) => c === r.control).map(([k]) => k).join('+') || 'ninguna';
  console.log(JSON.stringify({ ...r, hipotesis: which, candidatos: v }));
}
