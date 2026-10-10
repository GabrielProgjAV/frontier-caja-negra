// seq s10: suggestion edge cases + HALT exploration
import { run, v } from '../run.ts';
await run('s10', [
  [v('HALTA'), 'sugerencia empate a distancia 1 (ALTA/HALT): cuál gana?'],
  [v('AL'), 'sugerencia empate a distancia 2 (ALTA/HALT): cuál gana?'],
  [v('PNIGX'), 'Levenshtein (3, sin sugerencia) o Damerau (2, sugiere PING)?'],
  [v('pin'), 'minúsculas: sugerencia PING en mayúsculas?'],
  [v('CONSUL'), 'umbral absoluto: distancia 2 en comando largo sugiere?'],
  [v('ALTA;Ana'), 'setup AC-0001 antes de HALT'],
  [v('HALT;x'), 'HALT con 1 argumento: aridad?'],
  [v('HALT'), 'HALT sin argumentos: qué hace?'],
  [v('PING'), 'tras HALT: el servicio sigue respondiendo?'],
  [v('CONSULTA;AC-0001'), 'tras HALT: el estado se conserva?'],
  [v('ALTA;Beto'), 'tras HALT: se pueden crear cuentas?'],
  [v('halt'), 'HALT en minúsculas, segunda vez'],
]);
