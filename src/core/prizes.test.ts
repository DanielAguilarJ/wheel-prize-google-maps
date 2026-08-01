import { describe, expect, it } from 'vitest';
import {
  eligiblePrizes,
  expiryDate,
  generateCode,
  pickPrizeWith,
  probabilities,
  totalWeight,
  updatePrize,
  validatePrizes,
} from './prizes';
import type { Prize } from './types';
import { DEFAULT_PRIZES } from './defaults';

function prize(id: string, weight: number, enabled = true): Prize {
  return {
    id,
    label: `Premio ${id}`,
    icon: '🎁',
    weight,
    kind: 'sorpresa',
    detail: 'detalle',
    enabled,
  };
}

describe('eligiblePrizes', () => {
  it('excluye deshabilitados y de peso cero', () => {
    const list = [prize('a', 10), prize('b', 0), prize('c', 5, false)];
    expect(eligiblePrizes(list).map((p) => p.id)).toEqual(['a']);
  });
});

describe('totalWeight', () => {
  it('suma sólo los elegibles', () => {
    expect(totalWeight([prize('a', 10), prize('b', 5), prize('c', 100, false)])).toBe(15);
  });

  it('devuelve 0 con lista vacía', () => {
    expect(totalWeight([])).toBe(0);
  });
});

describe('probabilities', () => {
  it('reparte 100% entre los elegibles', () => {
    const list = [prize('a', 30), prize('b', 10), prize('c', 10, false)];
    const result = probabilities(list);
    expect(result.find((r) => r.id === 'a')?.percent).toBeCloseTo(75);
    expect(result.find((r) => r.id === 'b')?.percent).toBeCloseTo(25);
    expect(result.find((r) => r.id === 'c')?.percent).toBe(0);
  });

  it('los premios por defecto suman 100%', () => {
    const sum = probabilities(DEFAULT_PRIZES).reduce((acc, item) => acc + item.percent, 0);
    expect(sum).toBeCloseTo(100, 6);
  });
});

describe('pickPrizeWith', () => {
  const list = [prize('a', 50), prize('b', 30), prize('c', 20)];

  it('selecciona el primer tramo con random bajo', () => {
    expect(pickPrizeWith(list, 0)?.id).toBe('a');
    expect(pickPrizeWith(list, 0.49)?.id).toBe('a');
  });

  it('selecciona el tramo intermedio', () => {
    expect(pickPrizeWith(list, 0.5)?.id).toBe('b');
    expect(pickPrizeWith(list, 0.79)?.id).toBe('b');
  });

  it('selecciona el último tramo', () => {
    expect(pickPrizeWith(list, 0.8)?.id).toBe('c');
    expect(pickPrizeWith(list, 0.999999)?.id).toBe('c');
  });

  it('acota valores fuera de rango en lugar de fallar', () => {
    expect(pickPrizeWith(list, -5)?.id).toBe('a');
    expect(pickPrizeWith(list, 1)?.id).toBe('c');
    expect(pickPrizeWith(list, Number.NaN)?.id).toBe('a');
  });

  it('devuelve null si no hay premios elegibles', () => {
    expect(pickPrizeWith([prize('a', 0), prize('b', 5, false)], 0.5)).toBeNull();
    expect(pickPrizeWith([], 0.5)).toBeNull();
  });

  it('respeta la distribución esperada en 60 000 tiradas', () => {
    const counts = new Map<string, number>();
    const iterations = 60_000;
    for (let i = 0; i < iterations; i += 1) {
      const picked = pickPrizeWith(list, (i + 0.5) / iterations);
      counts.set(picked!.id, (counts.get(picked!.id) ?? 0) + 1);
    }
    expect((counts.get('a') ?? 0) / iterations).toBeCloseTo(0.5, 2);
    expect((counts.get('b') ?? 0) / iterations).toBeCloseTo(0.3, 2);
    expect((counts.get('c') ?? 0) / iterations).toBeCloseTo(0.2, 2);
  });
});

describe('generateCode', () => {
  it('usa el formato WB-XXXX-XXXX', () => {
    expect(generateCode(() => 0)).toMatch(/^WB-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('es determinista con un generador fijo', () => {
    expect(generateCode(() => 0)).toBe('WB-AAAA-AAAA');
  });

  it('evita caracteres ambiguos (I, O, 0, 1)', () => {
    let seed = 0;
    const code = generateCode(() => {
      seed += 0.037;
      return seed % 1;
    });
    expect(code.replace(/^WB-/, '')).not.toMatch(/[IO01]/);
  });

  it('acepta un prefijo alterno', () => {
    expect(generateCode(() => 0, 'UG')).toBe('UG-AAAA-AAAA');
  });
});

describe('validatePrizes', () => {
  it('acepta la configuración por defecto', () => {
    expect(validatePrizes(DEFAULT_PRIZES)).toEqual([]);
  });

  it('exige al menos dos premios', () => {
    const issues = validatePrizes([prize('a', 10)]);
    expect(issues.some((i) => i.message.includes('al menos 2'))).toBe(true);
  });

  it('detecta ids duplicados', () => {
    const issues = validatePrizes([prize('a', 10), prize('a', 5)]);
    expect(issues.some((i) => i.message.includes('duplicado'))).toBe(true);
  });

  it('detecta pesos negativos', () => {
    const issues = validatePrizes([prize('a', 10), prize('b', -3)]);
    expect(issues.some((i) => i.message.includes('Peso inválido'))).toBe(true);
  });

  it('detecta que ningún premio pueda salir', () => {
    const issues = validatePrizes([prize('a', 0), prize('b', 0)]);
    expect(issues.some((i) => i.message.includes('al menos un premio activo'))).toBe(true);
  });

  it('rechaza más de 12 segmentos', () => {
    const many = Array.from({ length: 13 }, (_, i) => prize(`p${i}`, 1));
    expect(validatePrizes(many).some((i) => i.message.includes('Máximo 12'))).toBe(true);
  });
});

describe('updatePrize', () => {
  it('devuelve una lista nueva sin mutar la original', () => {
    const original = [prize('a', 10), prize('b', 5)];
    const next = updatePrize(original, 'b', { weight: 99 });
    expect(next).not.toBe(original);
    expect(original[1]?.weight).toBe(5);
    expect(next[1]?.weight).toBe(99);
  });

  it('nunca cambia el id', () => {
    const next = updatePrize([prize('a', 1)], 'a', { id: 'hackeado' } as Partial<Prize>);
    expect(next[0]?.id).toBe('a');
  });
});

describe('expiryDate', () => {
  it('suma los días de vigencia', () => {
    const from = new Date('2026-03-01T12:00:00.000Z');
    expect(expiryDate(from, 30).toISOString()).toBe('2026-03-31T12:00:00.000Z');
  });
});
