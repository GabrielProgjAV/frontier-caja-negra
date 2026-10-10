// Control digit = ISO 7064 MOD 97-10 (IBAN style) over the message without its last segment.
// Digits count as themselves, letters as their alphabet position (A/a=1 .. Z/z=26, written in decimal),
// every other character (';', '-', spaces...) is ignored. control = 98 - (N*100 mod 97), range 1..98,
// compared as text: no leading zeros ("03" is not "3").
export function control(payload: string): number {
  let r = 0;
  for (const ch of payload) {
    const d = /[0-9]/.test(ch) ? ch : /[a-z]/i.test(ch) ? String(ch.toUpperCase().charCodeAt(0) - 64) : '';
    for (const x of d) r = (r * 10 + Number(x)) % 97;
  }
  return 98 - ((r * 100) % 97);
}
