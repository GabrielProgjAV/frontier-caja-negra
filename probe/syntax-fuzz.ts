// Syntax fuzzer: mutate valid messages and compare original vs local handle().
// NEVER calls the original for comparison; it calls the original to discover new behaviour.
// Usage: node --env-file=.env probe/syntax-fuzz.ts
import { send } from './send.ts';
import { control } from '../src/core/checksum.ts';
import { handle } from '../src/core/handle.ts';
import { initialState } from '../src/core/state.ts';
import { isDeepStrictEqual } from 'node:util';

function v(...parts: string[]): string {
  const payload = parts.join(';');
  return payload + ';' + control(payload);
}
function bad(payload: string, c: string): string { return payload + ';' + c; }

interface ProbeDef { cat: string; label: string; setup: string[]; m: string; raw?: string; }
interface Diff { seq: string; id?: number; cat: string; label: string; sent: string; originalStatus: number; originalBody: unknown; localStatus: number; localBody: unknown; }

const diffs: Diff[] = [];
const seqCounters: Record<string, number> = {};
function seqName(cat: string): string {
  seqCounters[cat] = (seqCounters[cat] ?? 0) + 1;
  return `syn-${cat}-${seqCounters[cat]}`;
}

async function run(defs: ProbeDef[]) {
  let state = initialState();
  let curSeq = '';
  for (const d of defs) {
    const seq = seqName(d.cat);
    // reset
    const resetLine = await send(seq, { hipotesis: `reset for ${d.label}`, path: '/__reset' });
    state = initialState();
    // setup
    let setupOk = true;
    for (const s of d.setup) {
      const body = JSON.stringify({ m: s });
      const local = handle(state, body);
      const line = await send(seq, { hipotesis: `setup ${s}`, body: { m: s } });
      if (line.status !== local.status || !isDeepStrictEqual(line.response, local.body)) {
        diffs.push({ seq, cat: 'setup-mismatch', label: `setup for ${d.label}`, sent: s, originalStatus: Number(line.status), originalBody: line.response, localStatus: local.status, localBody: local.body });
        setupOk = false; break;
      }
      state = local.state;
    }
    if (!setupOk) continue;
    // probe
    const payload = d.raw ?? JSON.stringify({ m: d.m });
    const local = handle(state, payload);
    const line = await send(seq, { hipotesis: `${d.label}: ${d.m ?? d.raw}`, body: d.raw ? undefined : { m: d.m }, raw: d.raw });
    if (line.status !== local.status || !isDeepStrictEqual(line.response, local.body)) {
      diffs.push({ seq, id: Number(line.id), cat: d.cat, label: d.label, sent: d.m ?? d.raw!, originalStatus: Number(line.status), originalBody: line.response, localStatus: local.status, localBody: local.body });
    }
  }
}

function add(cat: string, label: string, setup: string[], m: string) {
  defs.push({ cat, label, setup, m });
}
function addRaw(cat: string, label: string, setup: string[], raw: string) {
  defs.push({ cat, label, setup, m: '', raw });
}

const defs: ProbeDef[] = [];

// ========== PING ==========
const pingBase = v('PING'); // 64
add('PING-spaces', 'space-start', [], bad(' PING', '64'));
add('PING-spaces', 'space-end', [], bad('PING ', '64'));
add('PING-spaces', 'space-before-sep', [], bad('PING ;64', String(control('PING '))));
add('PING-spaces', 'space-after-sep', [], bad('PING; 64', String(control('PING'))));
add('PING-spaces', 'space-after-control', [], bad('PING;64 ', '64'));
add('PING-spaces', 'tab-start', [], bad('\tPING', '64'));
add('PING-spaces', 'tab-end', [], bad('PING\t', '64'));
add('PING-spaces', 'tab-around-sep', [], bad('PING\t;\t64', String(control('PING\t'))));
add('PING-case', 'lowercase', [], bad('ping', '64'));
add('PING-case', 'mixed', [], bad('Ping', '64'));
add('PING-case', 'pInG', [], bad('pInG', '64'));
add('PING-control', 'leading-zero', [], bad('PING', '064'));
add('PING-control', 'leading-zeros-3', [], bad('PING', '0064'));
add('PING-control', 'plus', [], bad('PING', '+64'));
add('PING-control', 'space-before', [], bad('PING', ' 64'));
add('PING-control', 'space-after', [], bad('PING', '64 '));
add('PING-control', 'letter-suffix', [], bad('PING', '64A'));
add('PING-control', 'empty', [], bad('PING', '')); // E104 actually, because empty segment
add('PING-arity', 'one-arg', [], v('PING', 'x'));
add('PING-arity', 'two-args', [], v('PING', 'x', 'y'));
add('PING-sep', 'leading-sep', [], bad('', 'PING;64'));
add('PING-sep', 'double-sep', [], bad('PING;;64', String(control('PING;'))));
add('PING-sep', 'trailing-sep', [], bad('PING;', '64'));

// ========== ALTA ==========
const altaBase = v('ALTA', 'Ana'); // 50
add('ALTA-spaces', 'space-start', [], bad(' ALTA;Ana', '50'));
add('ALTA-spaces', 'space-end-cmd', [], bad('ALTA ;Ana', String(control('ALTA '))));
add('ALTA-spaces', 'space-start-arg', [], bad('ALTA; Ana', String(control('ALTA; Ana'))));
add('ALTA-spaces', 'space-end-arg', [], bad('ALTA;Ana ', String(control('ALTA;Ana '))));
add('ALTA-spaces', 'space-in-name', [], v('ALTA', 'Ana Maria'));
add('ALTA-spaces', 'tab-start', [], bad('\tALTA;Ana', '50'));
add('ALTA-case', 'lowercase-cmd', [], bad('alta;Ana', '50'));
add('ALTA-case', 'mixed-cmd', [], bad('AlTa;Ana', '50'));
add('ALTA-case', 'lowercase-arg', [], bad('ALTA;ana', String(control('ALTA;ana'))));
add('ALTA-case', 'uppercase-arg', [], bad('ALTA;ANA', String(control('ALTA;ANA'))));
add('ALTA-empty', 'empty-name', [], bad('ALTA;', '50')); // E104
add('ALTA-special', 'quote-in-name', [], v('ALTA', 'An"a'));
add('ALTA-special', 'backslash-name', [], v('ALTA', 'An\\a'));
add('ALTA-special', 'emoji-name', [], v('ALTA', 'Ana😀'));
add('ALTA-special', 'newline-name', [], v('ALTA', 'Ana\nMaria'));
add('ALTA-arity', 'no-args', [], bad('ALTA', '50'));
add('ALTA-arity', 'two-args', [], v('ALTA', 'Ana', 'extra'));
add('ALTA-arity', 'three-args', [], v('ALTA', 'Ana', 'b', 'c'));
add('ALTA-sep', 'leading-sep', [], bad('', 'ALTA;Ana;50'));
add('ALTA-sep', 'double-sep', [], bad('ALTA;;Ana', String(control('ALTA;'))));
add('ALTA-sep', 'double-sep-end', [], bad('ALTA;Ana;;50', String(control('ALTA;Ana;'))));
add('ALTA-sep', 'trailing-sep', [], bad('ALTA;Ana;', '50'));
add('ALTA-control', 'leading-zero', [], bad('ALTA;Ana', '050'));
add('ALTA-control', 'space-before', [], bad('ALTA;Ana', ' 50'));
add('ALTA-control', 'space-after', [], bad('ALTA;Ana', '50 '));
add('ALTA-control', 'plus', [], bad('ALTA;Ana', '+50'));

// ========== CONSULTA (needs setup) ==========
const s1 = [v('ALTA', 'Ana')];
add('CONSULTA-spaces', 'space-start', s1, bad(' CONSULTA;AC-0001', '14'));
add('CONSULTA-spaces', 'space-end-cmd', s1, bad('CONSULTA ;AC-0001', String(control('CONSULTA '))));
add('CONSULTA-spaces', 'space-start-arg', s1, bad('CONSULTA; AC-0001', String(control('CONSULTA; AC-0001'))));
add('CONSULTA-spaces', 'space-end-arg', s1, bad('CONSULTA;AC-0001 ', String(control('CONSULTA;AC-0001 '))));
add('CONSULTA-case', 'lowercase-cmd', s1, bad('consulta;AC-0001', '14'));
add('CONSULTA-id', 'lowercase-id', s1, bad('CONSULTA;ac-0001', String(control('CONSULTA;ac-0001'))));
add('CONSULTA-id', 'short-id', s1, bad('CONSULTA;AC-1', String(control('CONSULTA;AC-1'))));
add('CONSULTA-id', 'leading-zero-id', s1, bad('CONSULTA;AC-01', String(control('CONSULTA;AC-01'))));
add('CONSULTA-id', 'long-id', s1, bad('CONSULTA;AC-00001', String(control('CONSULTA;AC-00001'))));
add('CONSULTA-id', 'no-dash-id', s1, bad('CONSULTA;AC0001', String(control('CONSULTA;AC0001'))));
add('CONSULTA-id', 'space-before-id', s1, bad('CONSULTA; AC-0001', String(control('CONSULTA; AC-0001'))));
add('CONSULTA-id', 'space-after-id', s1, bad('CONSULTA;AC-0001 ', String(control('CONSULTA;AC-0001 '))));
add('CONSULTA-arity', 'no-args', s1, bad('CONSULTA', '14'));
add('CONSULTA-arity', 'two-args', s1, v('CONSULTA', 'AC-0001', 'extra'));
add('CONSULTA-sep', 'double-sep', s1, bad('CONSULTA;;AC-0001', String(control('CONSULTA;'))));
add('CONSULTA-sep', 'trailing-sep', s1, bad('CONSULTA;AC-0001;', '14'));
add('CONSULTA-control', 'leading-zero', s1, bad('CONSULTA;AC-0001', '014'));
add('CONSULTA-control', 'space-after', s1, bad('CONSULTA;AC-0001', '14 '));

// ========== DEPOSITO (needs setup) ==========
const s2 = [v('ALTA', 'Ana')];
add('DEPOSITO-spaces', 'space-start', s2, bad(' DEPOSITO;AC-0001;100', '82'));
add('DEPOSITO-spaces', 'space-end-cmd', s2, bad('DEPOSITO ;AC-0001;100', String(control('DEPOSITO '))));
add('DEPOSITO-spaces', 'space-start-arg1', s2, bad('DEPOSITO; AC-0001;100', String(control('DEPOSITO; AC-0001;100'))));
add('DEPOSITO-spaces', 'space-end-arg1', s2, bad('DEPOSITO;AC-0001 ;100', String(control('DEPOSITO;AC-0001 ;100'))));
add('DEPOSITO-spaces', 'space-start-arg2', s2, bad('DEPOSITO;AC-0001; 100', String(control('DEPOSITO;AC-0001; 100'))));
add('DEPOSITO-spaces', 'space-end-arg2', s2, bad('DEPOSITO;AC-0001;100 ', String(control('DEPOSITO;AC-0001;100 '))));
add('DEPOSITO-case', 'lowercase-cmd', s2, bad('deposito;AC-0001;100', '82'));
add('DEPOSITO-case', 'mixed-cmd', s2, bad('Deposito;AC-0001;100', '82'));
add('DEPOSITO-monto', 'zero', s2, bad('DEPOSITO;AC-0001', '0'));
add('DEPOSITO-monto', 'leading-zero', s2, bad('DEPOSITO;AC-0001', '05'));
add('DEPOSITO-monto', 'plus', s2, bad('DEPOSITO;AC-0001', '+5'));
add('DEPOSITO-monto', 'minus', s2, bad('DEPOSITO;AC-0001', '-5'));
add('DEPOSITO-monto', 'decimal', s2, bad('DEPOSITO;AC-0001', '5.0'));
add('DEPOSITO-monto', 'exponent', s2, bad('DEPOSITO;AC-0001', '1e3'));
add('DEPOSITO-monto', 'space-before', s2, bad('DEPOSITO;AC-0001', ' 100'));
add('DEPOSITO-monto', 'space-after', s2, bad('DEPOSITO;AC-0001', '100 '));
add('DEPOSITO-monto', 'underscore', s2, bad('DEPOSITO;AC-0001', '1_000'));
add('DEPOSITO-monto', 'comma', s2, bad('DEPOSITO;AC-0001', '1,000'));
add('DEPOSITO-monto', 'space-internal', s2, bad('DEPOSITO;AC-0001', '1 000'));
add('DEPOSITO-monto', 'eleven-digits', s2, bad('DEPOSITO;AC-0001', '10000000000'));
add('DEPOSITO-monto', 'max-10-ok', s2, bad('DEPOSITO;AC-0001', '9999999999'));
add('DEPOSITO-id', 'lowercase-id', s2, bad('DEPOSITO;ac-0001;100', String(control('DEPOSITO;ac-0001;100'))));
add('DEPOSITO-id', 'short-id', s2, bad('DEPOSITO;AC-1;100', String(control('DEPOSITO;AC-1;100'))));
add('DEPOSITO-arity', 'one-arg', s2, bad('DEPOSITO;AC-0001', '82'));
add('DEPOSITO-arity', 'three-args', s2, v('DEPOSITO', 'AC-0001', '100', 'extra'));
add('DEPOSITO-sep', 'double-sep1', s2, bad('DEPOSITO;;AC-0001;100', String(control('DEPOSITO;'))));
add('DEPOSITO-sep', 'double-sep2', s2, bad('DEPOSITO;AC-0001;;100', String(control('DEPOSITO;AC-0001;'))));
add('DEPOSITO-sep', 'trailing-sep', s2, bad('DEPOSITO;AC-0001;100;', '82'));
add('DEPOSITO-control', 'leading-zero', s2, bad('DEPOSITO;AC-0001;100', '082'));
add('DEPOSITO-control', 'space-after', s2, bad('DEPOSITO;AC-0001;100', '82 '));

// ========== TRANSFER (needs 2 accounts) ==========
const s3 = [v('ALTA', 'Ana'), v('ALTA', 'Bob')];
add('TRANSFER-spaces', 'space-start', s3, bad(' TRANSFER;AC-0001;AC-0002;50', String(control(' TRANSFER;AC-0001;AC-0002;50'))));
add('TRANSFER-spaces', 'space-end-cmd', s3, bad('TRANSFER ;AC-0001;AC-0002;50', String(control('TRANSFER '))));
add('TRANSFER-spaces', 'space-start-arg1', s3, bad('TRANSFER; AC-0001;AC-0002;50', String(control('TRANSFER; AC-0001;AC-0002;50'))));
add('TRANSFER-spaces', 'space-end-arg1', s3, bad('TRANSFER;AC-0001 ;AC-0002;50', String(control('TRANSFER;AC-0001 ;AC-0002;50'))));
add('TRANSFER-spaces', 'space-start-arg2', s3, bad('TRANSFER;AC-0001; AC-0002;50', String(control('TRANSFER;AC-0001; AC-0002;50'))));
add('TRANSFER-spaces', 'space-end-arg2', s3, bad('TRANSFER;AC-0001;AC-0002 ;50', String(control('TRANSFER;AC-0001;AC-0002 ;50'))));
add('TRANSFER-spaces', 'space-start-arg3', s3, bad('TRANSFER;AC-0001;AC-0002; 50', String(control('TRANSFER;AC-0001;AC-0002; 50'))));
add('TRANSFER-case', 'lowercase-cmd', s3, bad('transfer;AC-0001;AC-0002;50', String(control('transfer;AC-0001;AC-0002;50'))));
add('TRANSFER-case', 'mixed-cmd', s3, bad('Transfer;AC-0001;AC-0002;50', String(control('Transfer;AC-0001;AC-0002;50'))));
add('TRANSFER-monto', 'zero', s3, bad('TRANSFER;AC-0001;AC-0002', '0'));
add('TRANSFER-monto', 'leading-zero', s3, bad('TRANSFER;AC-0001;AC-0002', '05'));
add('TRANSFER-monto', 'plus', s3, bad('TRANSFER;AC-0001;AC-0002', '+5'));
add('TRANSFER-monto', 'decimal', s3, bad('TRANSFER;AC-0001;AC-0002', '5.0'));
add('TRANSFER-monto', 'exponent', s3, bad('TRANSFER;AC-0001;AC-0002', '1e3'));
add('TRANSFER-monto', 'eleven-digits', s3, bad('TRANSFER;AC-0001;AC-0002', '10000000000'));
add('TRANSFER-monto', 'over-limit', s3, bad('TRANSFER;AC-0001;AC-0002', '100001'));
add('TRANSFER-monto', 'limit-ok', s3, bad('TRANSFER;AC-0001;AC-0002', '100000'));
add('TRANSFER-id', 'lowercase-from', s3, bad('TRANSFER;ac-0001;AC-0002;50', String(control('TRANSFER;ac-0001;AC-0002;50'))));
add('TRANSFER-id', 'short-from', s3, bad('TRANSFER;AC-1;AC-0002;50', String(control('TRANSFER;AC-1;AC-0002;50'))));
add('TRANSFER-same', 'same-account', s3, bad('TRANSFER;AC-0001;AC-0001;50', String(control('TRANSFER;AC-0001;AC-0001;50'))));
add('TRANSFER-same-name', 'same-name-skip-limit', [v('ALTA','Ana'), v('ALTA','Ana')], bad('TRANSFER;AC-0001;AC-0002', '100001'));
add('TRANSFER-arity', 'two-args', s3, bad('TRANSFER;AC-0001;AC-0002', '50'));
add('TRANSFER-arity', 'four-args', s3, v('TRANSFER', 'AC-0001', 'AC-0002', '50', 'extra'));
add('TRANSFER-sep', 'double-sep1', s3, bad('TRANSFER;;AC-0001;AC-0002;50', String(control('TRANSFER;'))));
add('TRANSFER-sep', 'trailing-sep', s3, bad('TRANSFER;AC-0001;AC-0002;50;', String(control('TRANSFER;AC-0001;AC-0002;50;'))));
add('TRANSFER-control', 'leading-zero', s3, bad('TRANSFER;AC-0001;AC-0002;50', '0' + String(control('TRANSFER;AC-0001;AC-0002;50'))));

// ========== ANULA (needs deposit) ==========
const s4 = [v('ALTA', 'Ana'), v('DEPOSITO', 'AC-0001', '100')];
add('ANULA-spaces', 'space-start', s4, bad(' ANULA;OP-0001', '66'));
add('ANULA-spaces', 'space-end-cmd', s4, bad('ANULA ;OP-0001', String(control('ANULA '))));
add('ANULA-spaces', 'space-start-arg', s4, bad('ANULA; OP-0001', String(control('ANULA; OP-0001'))));
add('ANULA-spaces', 'space-end-arg', s4, bad('ANULA;OP-0001 ', String(control('ANULA;OP-0001 '))));
add('ANULA-case', 'lowercase-cmd', s4, bad('anula;OP-0001', '66'));
add('ANULA-case', 'mixed-cmd', s4, bad('AnUlA;OP-0001', '66'));
add('ANULA-id', 'lowercase-id', s4, bad('ANULA;op-0001', String(control('ANULA;op-0001'))));
add('ANULA-id', 'short-id', s4, bad('ANULA;OP-1', String(control('ANULA;OP-1'))));
add('ANULA-id', 'leading-zero-id', s4, bad('ANULA;OP-01', String(control('ANULA;OP-01'))));
add('ANULA-id', 'long-id', s4, bad('ANULA;OP-00001', String(control('ANULA;OP-00001'))));
add('ANULA-id', 'no-dash-id', s4, bad('ANULA;OP0001', String(control('ANULA;OP0001'))));
add('ANULA-id', 'account-id', s4, bad('ANULA;AC-0001', String(control('ANULA;AC-0001'))));
add('ANULA-arity', 'no-args', s4, bad('ANULA', '66'));
add('ANULA-arity', 'two-args', s4, v('ANULA', 'OP-0001', 'extra'));
add('ANULA-sep', 'double-sep', s4, bad('ANULA;;OP-0001', String(control('ANULA;'))));
add('ANULA-sep', 'trailing-sep', s4, bad('ANULA;OP-0001;', '66'));
add('ANULA-control', 'leading-zero', s4, bad('ANULA;OP-0001', '066'));
add('ANULA-control', 'space-after', s4, bad('ANULA;OP-0001', '66 '));

// ========== HALT ==========
add('HALT-spaces', 'space-start', [], bad(' HALT;1', '19'));
add('HALT-spaces', 'space-end-cmd', [], bad('HALT ;1', String(control('HALT '))));
add('HALT-spaces', 'space-start-arg', [], bad('HALT; 1', String(control('HALT; 1'))));
add('HALT-spaces', 'space-end-arg', [], bad('HALT;1 ', String(control('HALT;1 '))));
add('HALT-case', 'lowercase-cmd', [], bad('halt;1', '19'));
add('HALT-case', 'mixed-cmd', [], bad('HaLt;1', '19'));
add('HALT-arg', 'zero', [], bad('HALT;0', '22'));
add('HALT-arg', 'two', [], bad('HALT;2', '16'));
add('HALT-arg', 'x', [], bad('HALT;x', String(control('HALT;x'))));
add('HALT-arg', 'empty', [], bad('HALT;', '19')); // E104
add('HALT-arity', 'no-args', [], bad('HALT', '19'));
add('HALT-arity', 'two-args', [], v('HALT', '1', 'extra'));
add('HALT-sep', 'double-sep', [], bad('HALT;;1', String(control('HALT;'))));
add('HALT-sep', 'trailing-sep', [], bad('HALT;1;', '19'));
add('HALT-control', 'leading-zero', [], bad('HALT;1', '019'));
add('HALT-control', 'space-after', [], bad('HALT;1', '19 '));

// ========== UNKNOWN / SUGGESTION ==========
add('UNKNOWN', 'HELP', [], bad('HELP', String(control('HELP'))));
add('UNKNOWN', 'BALANCE', [], bad('BALANCE', String(control('BALANCE'))));
add('UNKNOWN', 'SALDO', [], bad('SALDO', String(control('SALDO'))));
add('UNKNOWN', 'empty-cmd', [], bad('', '64')); // E104
add('UNKNOWN', 'semicolon-only', [], bad(';', '64')); // E104

// ========== JSON BODY VARIANTS ==========
addRaw('JSON', 'null-m', [], '{"m":null}');
addRaw('JSON', 'number-m', [], '{"m":123}');
addRaw('JSON', 'bool-m', [], '{"m":true}');
addRaw('JSON', 'array-m', [], '{"m":[]}');
addRaw('JSON', 'object-m', [], '{"m":{}}');
addRaw('JSON', 'missing-m', [], '{}');
addRaw('JSON', 'array-root', [], '[]');
addRaw('JSON', 'string-root', [], '"texto"');
addRaw('JSON', 'duplicate-m-last-wins', [], '{"m":"PING;64","m":"ALTA;Ana;50"}');
addRaw('JSON', 'bad-json', [], '{bad json');
addRaw('JSON', 'bom-prefix', [], '\uFEFF{"m":"PING;64"}');
addRaw('JSON', 'newline-in-m', [], '{"m":"PING;\\n64"}');
addRaw('JSON', 'tab-in-m', [], '{"m":"PING;\\t64"}');
addRaw('JSON', 'null-root', [], 'null');
addRaw('JSON', 'number-root', [], '42');
addRaw('JSON', 'empty-body', [], '');
addRaw('JSON', 'spaces-only', [], '   ');

// ========== RAW BODY (non-JSON) ==========
addRaw('RAW', 'plain-text', [], 'PING;64');
addRaw('RAW', 'plain-text-json-like', [], 'm=PING;64');
addRaw('RAW', 'trailing-comma', [], '{"m":"PING;64",}');
addRaw('RAW', 'single-quotes', [], "{'m':'PING;64'}");
addRaw('RAW', 'unclosed-string', [], '{"m":"PING;64}');

console.log(`Total probes: ${defs.length}`);

await run(defs);

// Report
const byCat: Record<string, Diff[]> = {};
for (const d of diffs) (byCat[d.cat] ??= []).push(d);

console.log(`\n=== DIFFS: ${diffs.length} ===`);
for (const [cat, arr] of Object.entries(byCat).sort()) {
  console.log(`\n${cat} (${arr.length}):`);
  for (const d of arr) {
    console.log(`  #${d.id ?? '?'} ${d.label}: sent=${JSON.stringify(d.sent)} orig=${d.originalStatus} ${JSON.stringify(d.originalBody)} local=${d.localStatus} ${JSON.stringify(d.localBody)}`);
  }
}

if (diffs.length) {
  console.log(`\nWriting probe/syntax-diffs.jsonl with ${diffs.length} lines`);
  const fs = await import('node:fs');
  fs.writeFileSync('probe/syntax-diffs.jsonl', diffs.map(d => JSON.stringify(d)).join('\n') + '\n');
}

console.log(`\nBudget used today: check probe/budget.json`);
