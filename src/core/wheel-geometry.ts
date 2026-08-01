/**
 * Geometría de la ruleta. Funciones puras: sin canvas, sin DOM.
 * Convención: los segmentos se dibujan en sentido horario a partir del ángulo 0
 * (eje X positivo) y la aguja fija está arriba, en -PI/2.
 */

export const TAU = Math.PI * 2;
export const POINTER_ANGLE = -Math.PI / 2;

/** Ángulo que ocupa cada segmento. */
export function segmentAngle(count: number): number {
  if (count <= 0) return 0;
  return TAU / count;
}

/** Normaliza un ángulo al rango [0, 2PI). */
export function normalizeAngle(angle: number): number {
  const mod = angle % TAU;
  return mod < 0 ? mod + TAU : mod;
}

/**
 * Rotación final para que el segmento `index` quede bajo la aguja.
 * `turns` son las vueltas completas de espectáculo antes de frenar.
 * `jitter` (0..1) desplaza el punto de parada dentro del segmento para que
 * la ruleta no se detenga siempre exactamente en el centro.
 */
export function targetRotation(
  index: number,
  count: number,
  currentRotation: number,
  turns = 6,
  jitter = 0.5,
): number {
  const seg = segmentAngle(count);
  if (seg === 0) return currentRotation;

  const safeJitter = Math.min(Math.max(jitter, 0.08), 0.92);
  const localAngle = (index + safeJitter) * seg;
  const desired = POINTER_ANGLE - localAngle;

  // Avanza siempre hacia adelante desde la rotación actual.
  const forward = normalizeAngle(desired - currentRotation);
  return currentRotation + forward + Math.max(1, Math.floor(turns)) * TAU;
}

/** Índice del segmento que está bajo la aguja para una rotación dada. */
export function indexAtPointer(rotation: number, count: number): number {
  const seg = segmentAngle(count);
  if (seg === 0) return -1;
  const local = normalizeAngle(POINTER_ANGLE - rotation);
  const index = Math.floor(local / seg);
  return Math.min(index, count - 1);
}

/** Desaceleración suave del giro. t en [0,1]. */
export function easeOutQuart(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 4);
}

/** Rotación interpolada en un instante del giro. */
export function rotationAt(from: number, to: number, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return to;
  const progress = easeOutQuart(elapsedMs / durationMs);
  return from + (to - from) * progress;
}

/** Tamaño de letra que cabe en el segmento según el radio y la cantidad de premios. */
export function labelFontSize(radius: number, count: number): number {
  const base = radius / 9;
  const crowding = Math.max(0, count - 6) * 0.06;
  return Math.max(10, Math.round(base * (1 - crowding)));
}

/**
 * Parte una etiqueta en varias líneas para que quepa en el segmento.
 * Corta por palabras y limita el número de líneas.
 */
export function wrapLabel(label: string, maxCharsPerLine: number, maxLines = 3): readonly string[] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines) {
    const consumed = lines.join(' ').split(/\s+/).length;
    if (consumed < words.length) {
      const last = lines[maxLines - 1] ?? '';
      lines[maxLines - 1] = `${last.slice(0, Math.max(1, maxCharsPerLine - 1))}…`;
    }
  }
  return lines;
}
