import { describe, expect, it } from 'vitest';
import { formatRemaining, nextDeadline, pad2, remainingUntil } from './countdown';

describe('nextDeadline', () => {
  const anchor = new Date('2026-03-01T00:00:00.000Z');

  it('devuelve el cierre del ciclo en curso', () => {
    const deadline = nextDeadline(new Date('2026-03-01T10:00:00.000Z'), anchor, 24);
    expect(deadline.toISOString()).toBe('2026-03-02T00:00:00.000Z');
  });

  it('se renueva en ciclos posteriores en lugar de quedarse en cero', () => {
    const deadline = nextDeadline(new Date('2026-03-05T13:00:00.000Z'), anchor, 24);
    expect(deadline.toISOString()).toBe('2026-03-06T00:00:00.000Z');
  });

  it('siempre queda en el futuro', () => {
    const now = new Date('2026-07-15T18:42:11.000Z');
    expect(nextDeadline(now, anchor, 24).getTime()).toBeGreaterThan(now.getTime());
  });

  it('soporta ciclos distintos de 24 h', () => {
    const deadline = nextDeadline(new Date('2026-03-01T05:00:00.000Z'), anchor, 6);
    expect(deadline.toISOString()).toBe('2026-03-01T06:00:00.000Z');
  });
});

describe('remainingUntil', () => {
  it('descompone horas, minutos y segundos', () => {
    const remaining = remainingUntil(
      new Date('2026-03-01T00:00:00.000Z'),
      new Date('2026-03-01T23:55:27.000Z'),
    );
    expect(remaining).toMatchObject({ hours: 23, minutes: 55, seconds: 27 });
  });

  it('no baja de cero con fechas pasadas', () => {
    const remaining = remainingUntil(
      new Date('2026-03-02T00:00:00.000Z'),
      new Date('2026-03-01T00:00:00.000Z'),
    );
    expect(remaining.totalMs).toBe(0);
    expect(formatRemaining(remaining)).toBe('00:00:00');
  });
});

describe('pad2 y formatRemaining', () => {
  it('rellena con cero', () => {
    expect(pad2(7)).toBe('07');
    expect(pad2(-3)).toBe('00');
  });

  it('formatea hh:mm:ss', () => {
    expect(formatRemaining({ totalMs: 0, hours: 5, minutes: 4, seconds: 3 })).toBe('05:04:03');
  });
});
