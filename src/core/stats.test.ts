import { describe, expect, it } from 'vitest';
import { computeStats, dayKey, projectImpact, DEFAULT_ASSUMPTIONS } from './stats';
import type { PlayRecord, Prize } from './types';

const prizes: readonly Prize[] = [
  { id: 'a', label: 'Diagnóstico', icon: '🧠', weight: 10, kind: 'diagnostico', detail: '', enabled: true },
  { id: 'b', label: 'Descuento', icon: '💥', weight: 5, kind: 'descuento', detail: '', enabled: true },
];

function play(patch: Partial<PlayRecord> & Pick<PlayRecord, 'id' | 'at'>): PlayRecord {
  return {
    prizeId: 'a',
    prizeLabel: 'Diagnóstico',
    code: 'WB-XXXX-YYYY',
    name: 'Ana',
    contact: 'ana@example.com',
    programId: 'fotolectura',
    audience: 'jovenes-adultos',
    source: 'directo',
    consent: true,
    rating: null,
    feedback: '',
    reviewOpened: false,
    redeemed: false,
    ...patch,
  };
}

describe('dayKey', () => {
  it('formatea como YYYY-MM-DD en horario local', () => {
    expect(dayKey(new Date(2026, 2, 5, 23, 30))).toBe('2026-03-05');
  });
});

describe('computeStats', () => {
  const now = new Date(2026, 2, 10, 12, 0, 0);

  it('devuelve ceros sin jugadas', () => {
    const stats = computeStats([], prizes, now);
    expect(stats.total).toBe(0);
    expect(stats.averageRating).toBeNull();
    expect(stats.reviewRate).toBe(0);
    expect(stats.byPrize).toEqual([]);
  });

  it('cuenta totales, hoy, 7 y 30 días', () => {
    const plays = [
      play({ id: '1', at: new Date(2026, 2, 10, 9, 0).toISOString() }),
      play({ id: '2', at: new Date(2026, 2, 8, 9, 0).toISOString() }),
      play({ id: '3', at: new Date(2026, 1, 20, 9, 0).toISOString() }),
      play({ id: '4', at: new Date(2025, 11, 1, 9, 0).toISOString() }),
    ];
    const stats = computeStats(plays, prizes, now);
    expect(stats.total).toBe(4);
    expect(stats.today).toBe(1);
    expect(stats.last7Days).toBe(2);
    expect(stats.last30Days).toBe(3);
  });

  it('calcula leads, consentimientos, reseñas y entregas', () => {
    const plays = [
      play({ id: '1', at: now.toISOString(), reviewOpened: true, redeemed: true }),
      play({ id: '2', at: now.toISOString(), contact: '', consent: false }),
      play({ id: '3', at: now.toISOString(), reviewOpened: true }),
      play({ id: '4', at: now.toISOString() }),
    ];
    const stats = computeStats(plays, prizes, now);
    expect(stats.leads).toBe(3);
    expect(stats.consented).toBe(3);
    expect(stats.reviewsOpened).toBe(2);
    expect(stats.redeemed).toBe(1);
    expect(stats.reviewRate).toBe(50);
  });

  it('promedia sólo valoraciones válidas', () => {
    const plays = [
      play({ id: '1', at: now.toISOString(), rating: 5 }),
      play({ id: '2', at: now.toISOString(), rating: 4 }),
      play({ id: '3', at: now.toISOString(), rating: null }),
      play({ id: '4', at: now.toISOString(), rating: 9 }),
    ];
    expect(computeStats(plays, prizes, now).averageRating).toBe(4.5);
  });

  it('agrupa por premio con etiqueta legible y orden descendente', () => {
    const plays = [
      play({ id: '1', at: now.toISOString(), prizeId: 'b' }),
      play({ id: '2', at: now.toISOString(), prizeId: 'a' }),
      play({ id: '3', at: now.toISOString(), prizeId: 'a' }),
      play({ id: '4', at: now.toISOString(), prizeId: 'desconocido' }),
    ];
    const stats = computeStats(plays, prizes, now);
    expect(stats.byPrize[0]).toEqual({ prizeId: 'a', label: 'Diagnóstico', count: 2 });
    expect(stats.byPrize.find((p) => p.prizeId === 'desconocido')?.label).toBe('desconocido');
  });

  it('agrupa por programa y por día', () => {
    const plays = [
      play({ id: '1', at: new Date(2026, 2, 9, 10, 0).toISOString(), programId: 'mathekids' }),
      play({ id: '2', at: new Date(2026, 2, 10, 10, 0).toISOString(), programId: 'mathekids' }),
      play({ id: '3', at: new Date(2026, 2, 10, 11, 0).toISOString(), programId: '' }),
    ];
    const stats = computeStats(plays, prizes, now);
    expect(stats.byProgram[0]).toEqual({ programId: 'mathekids', count: 2 });
    expect(stats.byProgram.some((p) => p.programId === 'sin-programa')).toBe(true);
    expect(stats.byDay).toEqual([
      { day: '2026-03-09', count: 1 },
      { day: '2026-03-10', count: 2 },
    ]);
  });
});

describe('projectImpact', () => {
  it('encadena las tasas del embudo', () => {
    const result = projectImpact(300, DEFAULT_ASSUMPTIONS);
    expect(result.spins).toBe(165);
    expect(result.reviews).toBe(58);
    expect(result.leads).toBe(116);
    expect(result.diagnostics).toBe(41);
    expect(result.enrollments).toBe(12);
    expect(result.revenueMxn).toBe(12 * DEFAULT_ASSUMPTIONS.ticketMxn);
  });

  it('trata entradas negativas como cero', () => {
    expect(projectImpact(-50)).toEqual({
      spins: 0,
      reviews: 0,
      leads: 0,
      diagnostics: 0,
      enrollments: 0,
      revenueMxn: 0,
    });
  });

  it('escala de forma monótona', () => {
    expect(projectImpact(1000).revenueMxn).toBeGreaterThan(projectImpact(100).revenueMxn);
  });
});
