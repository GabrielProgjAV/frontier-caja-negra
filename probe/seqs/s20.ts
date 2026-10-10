// seq s20: ALTA names with spaces (control computed ignoring spaces) + TRANSFER digit cap order
import { run, v } from '../run.ts';
import { control } from '../../src/core/checksum.ts';
await run('s20', [
  [v('ALTA;Ana Maria'), 'espacio interno: aceptado con control que ignora espacios'],
  [v('ALTA; Ana'), 'espacio inicial en nombre: aceptado? (no hay comando que devuelva el nombre: recorte no observable)'],
  [v('ALTA;Ana '), 'espacio final en nombre: aceptado?'],
  [v('ALTA;  Ana  Maria  '), 'espacios múltiples alrededor y dentro: aceptado con el mismo control que AnaMaria?'],
  [`ALTA;  Ana  Maria  ;${control('ALTA;AnaMaria')}`, 'control de "ALTA;AnaMaria" usado con espacios: idéntico -> los espacios no cambian el control'],
  [`ALTA;Ana Maria;${control('ALTA;Ana0Maria')}`, 'control como si el espacio contara 0: debe ser E202 (otro valor)'],
  [v('ALTA;   '), 'nombre solo de espacios: 201 o E104?'],
  [v('ALTA;\tAna'), 'tabulador en el nombre: aceptado?'],
  [v('CONSULTA;AC-0007'), 'contador: cuántas ALTA anteriores crearon cuenta (AC-0007 existe si las 7 fueron 201)'],
  [v('DEPOSITO;AC-0001;100000'), 'setup saldo'],
  [v('TRANSFER;AC-0001;AC-0002;99999999999'), 'TRANSFER 11 dígitos: E303 (tope de dígitos) o E506 (límite)?'],
  [v('TRANSFER;AC-0001;AC-0002;9999999999'), 'TRANSFER 10 dígitos: E506 esperado'],
]);
