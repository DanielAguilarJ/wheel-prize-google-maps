/**
 * Cuenta regresiva de la promoción.
 * En lugar de una fecha fija que caduca y deja la página en cero,
 * se usa un ciclo que se renueva cada N horas a partir de un ancla.
 */

export interface Remaining {
  readonly totalMs: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

export const DEFAULT_CYCLE_HOURS = 24;

/** Próximo cierre de la promoción a partir de un ancla y una duración de ciclo. */
export function nextDeadline(now: Date, anchor: Date, cycleHours = DEFAULT_CYCLE_HOURS): Date {
  const cycleMs = Math.max(1, cycleHours) * 60 * 60 * 1000;
  const elapsed = now.getTime() - anchor.getTime();
  const cyclesPassed = Math.floor(elapsed / cycleMs) + 1;
  return new Date(anchor.getTime() + cyclesPassed * cycleMs);
}

export function remainingUntil(now: Date, deadline: Date): Remaining {
  const totalMs = Math.max(0, deadline.getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    totalMs,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function pad2(value: number): string {
  return `${Math.max(0, Math.floor(value))}`.padStart(2, '0');
}

export function formatRemaining(remaining: Remaining): string {
  return `${pad2(remaining.hours)}:${pad2(remaining.minutes)}:${pad2(remaining.seconds)}`;
}
