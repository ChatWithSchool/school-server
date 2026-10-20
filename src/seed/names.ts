/** Fictional, gender-neutral sample names: the same list is used in the design file. */
export const FIRST = [
  'נועם',
  'יובל',
  'עדי',
  'טל',
  'אור',
  'גל',
  'שחר',
  'עמית',
  'ליאור',
  'מור',
  'אופק',
  'ים',
  'שי',
  'רז',
  'נוי',
  'דור',
];
export const LAST = [
  'כהן',
  'לוי',
  'מזרחי',
  'ביטון',
  'פרידמן',
  'גולדשטיין',
  'רוזנברג',
  'שפירא',
  'קליין',
  'ברק',
  'דהן',
  'אזולאי',
  'חדד',
  'פרץ',
  'אברהמי',
  'סבן',
];
export const FIRST_EN = [
  'noam',
  'yuval',
  'adi',
  'tal',
  'or',
  'gal',
  'shachar',
  'amit',
  'lior',
  'mor',
  'ofek',
  'yam',
  'shay',
  'raz',
  'noy',
  'dor',
];
export const LAST_EN = [
  'cohen',
  'levi',
  'mizrahi',
  'biton',
  'friedman',
  'goldstein',
  'rosenberg',
  'shapira',
  'klein',
  'barak',
  'dahan',
  'azulay',
  'hadad',
  'peretz',
  'avrahami',
  'saban',
];

export const stuFirst = (i: number) => FIRST[i % 16];
export const stuLast = (i: number) => LAST[(i * 5 + 3) % 16];
export const stfFirst = (i: number) => FIRST[(i * 3 + 1) % 16];
export const stfLast = (i: number) => LAST[(i * 7 + 2) % 16];
export const parFirst = (i: number) => FIRST[(i * 5 + 7) % 16];
const mail = (f: number, l: number) => `${FIRST_EN[f % 16]}.${LAST_EN[l % 16]}@school.example`;
export const stfMail = (i: number) => mail(i * 3 + 1, i * 7 + 2);
export const parMail = (i: number) => mail(i * 5 + 7, i * 5 + 3);
