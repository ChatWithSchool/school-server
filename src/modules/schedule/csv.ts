const BOM = '\uFEFF';

function escapeCell(value: string | number | undefined | null): string {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}
