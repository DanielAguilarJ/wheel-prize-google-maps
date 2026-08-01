/**
 * Construcción de la URL que se codifica en el QR del cartel.
 * Se mantiene fuera de la página para poder probarla sin navegador.
 */

/** Limpia una etiqueta de origen para que sea segura en una URL y legible en el CSV. */
export function normalizeSource(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

/**
 * Añade los parámetros `origen` y `programa` a la URL base.
 * Si la base no es una URL válida se devuelve tal cual, para que el problema
 * sea visible en pantalla en lugar de generar un QR que no lleva a ningún lado.
 */
export function buildQrUrl(base: string, source: string, programId: string): string {
  const trimmed = base.trim();
  try {
    const url = new URL(trimmed);
    const cleanSource = normalizeSource(source);
    if (cleanSource) url.searchParams.set('origen', cleanSource);
    if (programId.trim()) url.searchParams.set('programa', programId.trim());
    return url.toString();
  } catch {
    return trimmed;
  }
}
