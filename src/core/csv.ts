import type { PlayRecord } from './types';

/**
 * Escapa un campo para CSV.
 * Se antepone un apóstrofo a valores que empiezan con =, +, -, @, tab o CR
 * para evitar la inyección de fórmulas al abrir el archivo en Excel/Sheets.
 */
export function escapeCsvField(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const dangerous = /^[=+\-@\t\r]/.test(raw);
  const text = dangerous ? `'${raw}` : raw;
  if (/[",\n\r;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export const PLAY_CSV_HEADERS: readonly string[] = Object.freeze([
  'id',
  'fecha_iso',
  'fecha_local',
  'premio_id',
  'premio',
  'codigo',
  'nombre',
  'contacto',
  'programa',
  'audiencia',
  'origen',
  'consentimiento',
  'estrellas',
  'comentario_privado',
  'abrio_google',
  'entregado',
]);

function localDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-MX', { hour12: false });
}

export function playToRow(play: PlayRecord): readonly string[] {
  return [
    play.id,
    play.at,
    localDate(play.at),
    play.prizeId,
    play.prizeLabel,
    play.code,
    play.name,
    play.contact,
    play.programId,
    play.audience,
    play.source,
    play.consent ? 'si' : 'no',
    play.rating === null ? '' : String(play.rating),
    play.feedback,
    play.reviewOpened ? 'si' : 'no',
    play.redeemed ? 'si' : 'no',
  ].map(escapeCsvField);
}

/** CSV completo del histórico. Se usa BOM al descargar para que Excel lea acentos. */
export function playsToCsv(plays: readonly PlayRecord[]): string {
  const lines = [PLAY_CSV_HEADERS.join(','), ...plays.map((play) => playToRow(play).join(','))];
  return lines.join('\r\n');
}

export function csvFileName(now: Date = new Date(), prefix = 'ultragiro-jugadas'): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `${prefix}-${stamp}.csv`;
}

/** Dispara la descarga del CSV en el navegador. */
export function downloadCsv(plays: readonly PlayRecord[], now: Date = new Date()): void {
  const csv = `\uFEFF${playsToCsv(plays)}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = csvFileName(now);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
