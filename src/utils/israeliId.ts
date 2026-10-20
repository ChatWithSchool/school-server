/** Validates an Israeli ID number (check digit). Short numbers are padded with zeros. */
export function isValidIsraeliId(id: string): boolean {
  const s = id.trim();
  if (!/^\d{5,9}$/.test(s)) return false;
  const padded = s.padStart(9, '0');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(padded[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0;
}
