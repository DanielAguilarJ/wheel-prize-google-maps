import type { PlayRecord, Prize, Stats } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Clave de día local (YYYY-MM-DD) para agrupar jugadas. */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function withinDays(play: PlayRecord, now: Date, days: number): boolean {
  const at = new Date(play.at).getTime();
  if (Number.isNaN(at)) return false;
  const diff = now.getTime() - at;
  return diff >= 0 && diff <= days * DAY_MS;
}

function countBy<T extends string>(items: readonly T[]): ReadonlyMap<T, number> {
  const map = new Map<T, number>();
  for (const item of items) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return map;
}

/** Métricas del panel admin. Función pura: mismas entradas, misma salida. */
export function computeStats(
  plays: readonly PlayRecord[],
  prizes: readonly Prize[],
  now: Date = new Date(),
): Stats {
  const todayKey = dayKey(now);
  const ratings = plays
    .map((play) => play.rating)
    .filter((rating): rating is number => typeof rating === 'number' && rating >= 1 && rating <= 5);

  const prizeCounts = countBy(plays.map((play) => play.prizeId));
  const labelById = new Map(prizes.map((prize) => [prize.id, prize.label]));

  const byPrize = [...prizeCounts.entries()]
    .map(([prizeId, count]) => ({
      prizeId,
      label: labelById.get(prizeId) ?? prizeId,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const byProgram = [...countBy(plays.map((play) => play.programId || 'sin-programa')).entries()]
    .map(([programId, count]) => ({ programId, count }))
    .sort((a, b) => b.count - a.count || a.programId.localeCompare(b.programId));

  const byDay = [...countBy(plays.map((play) => dayKey(new Date(play.at)))).entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const reviewsOpened = plays.filter((play) => play.reviewOpened).length;

  return {
    total: plays.length,
    today: plays.filter((play) => dayKey(new Date(play.at)) === todayKey).length,
    last7Days: plays.filter((play) => withinDays(play, now, 7)).length,
    last30Days: plays.filter((play) => withinDays(play, now, 30)).length,
    leads: plays.filter((play) => play.contact.trim().length > 0).length,
    consented: plays.filter((play) => play.consent).length,
    reviewsOpened,
    redeemed: plays.filter((play) => play.redeemed).length,
    averageRating:
      ratings.length === 0
        ? null
        : Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 100) / 100,
    reviewRate: plays.length === 0 ? 0 : Math.round((reviewsOpened / plays.length) * 1000) / 10,
    byPrize,
    byProgram,
    byDay,
  };
}

/**
 * Proyección de impacto para la landing (calculadora de ROI).
 * Es un modelo transparente, no una promesa: expone sus propios supuestos.
 */
export interface ImpactAssumptions {
  /** Personas que pasan por el instituto o reciben el QR al mes. */
  readonly visitorsPerMonth: number;
  /** % de quienes escanean y giran la ruleta. */
  readonly spinRate: number;
  /** % de quienes giran y publican reseña 5★. */
  readonly reviewRate: number;
  /** % de jugadores que dejan datos de contacto. */
  readonly leadRate: number;
  /** % de leads que agendan diagnóstico. */
  readonly diagnosticRate: number;
  /** % de diagnósticos que se convierten en inscripción. */
  readonly closeRate: number;
  /** Ticket promedio mensual del programa, en MXN. */
  readonly ticketMxn: number;
}

export const DEFAULT_ASSUMPTIONS: ImpactAssumptions = Object.freeze({
  visitorsPerMonth: 300,
  spinRate: 0.55,
  reviewRate: 0.35,
  leadRate: 0.7,
  diagnosticRate: 0.35,
  closeRate: 0.3,
  ticketMxn: 1800,
});

export interface ImpactProjection {
  readonly spins: number;
  readonly reviews: number;
  readonly leads: number;
  readonly diagnostics: number;
  readonly enrollments: number;
  readonly revenueMxn: number;
}

/** Redondeo estable: corrige el ruido de coma flotante antes de redondear. */
function roundStable(value: number): number {
  return Math.round(Math.round(value * 1e6) / 1e6);
}

export function projectImpact(
  visitorsPerMonth: number,
  assumptions: ImpactAssumptions = DEFAULT_ASSUMPTIONS,
): ImpactProjection {
  const visitors = Math.max(0, Math.floor(visitorsPerMonth));
  const spins = roundStable(visitors * assumptions.spinRate);
  const reviews = roundStable(spins * assumptions.reviewRate);
  const leads = roundStable(spins * assumptions.leadRate);
  const diagnostics = roundStable(leads * assumptions.diagnosticRate);
  const enrollments = roundStable(diagnostics * assumptions.closeRate);
  return {
    spins,
    reviews,
    leads,
    diagnostics,
    enrollments,
    revenueMxn: enrollments * assumptions.ticketMxn,
  };
}
