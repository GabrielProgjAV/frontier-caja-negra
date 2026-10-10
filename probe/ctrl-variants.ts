// Control candidates for non-ASCII letters under rival hypotheses (H1 = current checksum.ts).
import { control } from '../src/core/checksum.ts';
const mod = (digits: string) => { let r = 0; for (const x of digits) r = (r * 10 + Number(x)) % 97; return 98 - ((r * 100) % 97); };
const generic = (p: string, nonAscii: (ch: string) => string) =>
  mod([...p].map((ch) => (/[0-9]/.test(ch) ? ch : /[a-z]/i.test(ch) ? String(ch.toUpperCase().charCodeAt(0) - 64) : /[^\x00-\x7f]/.test(ch) ? nonAscii(ch) : '')).join(''));
const strip = (ch: string) => ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const variants = (p: string) => ({
  H1_ignorar: control(p),
  H2_sin_tilde: generic(p, (ch) => { const b = strip(ch); return /[a-z]/i.test(b) ? String(b.toUpperCase().charCodeAt(0) - 64) : ''; }),
  H3a_latin1: generic(p, (ch) => String(ch.toUpperCase().charCodeAt(0) - 64)),
  H3b_enie15: generic(p, (ch) => (/ñ/i.test(ch) ? '15' : (() => { const b = strip(ch); return /[a-z]/i.test(b) ? String(b.toUpperCase().charCodeAt(0) - 64) : ''; })())),
});
if (import.meta.main) for (const p of process.argv.slice(2)) console.log(p, JSON.stringify(variants(p)));
