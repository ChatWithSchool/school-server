import { toCsv } from './csv';

describe('toCsv', () => {
  it('writes a UTF-8 BOM, escaped cells, and CRLF line endings', () => {
    expect(toCsv(['יום', 'חדר'], [['ראשון', 'חדר "א", 1']])).toBe(
      '\uFEFFיום,חדר\r\nראשון,"חדר ""א"", 1"\r\n',
    );
  });

  it('writes a header row when there are no lessons', () => {
    expect(toCsv(['יום', 'שעה'], [])).toBe('\uFEFFיום,שעה\r\n');
  });
});
