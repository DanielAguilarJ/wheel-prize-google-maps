import { describe, expect, it } from 'vitest';
import {
  easeOutQuart,
  indexAtPointer,
  labelFontSize,
  normalizeAngle,
  rotationAt,
  segmentAngle,
  targetRotation,
  wrapLabel,
  TAU,
} from './wheel-geometry';

describe('segmentAngle', () => {
  it('divide el círculo entre los segmentos', () => {
    expect(segmentAngle(4)).toBeCloseTo(Math.PI / 2);
    expect(segmentAngle(8)).toBeCloseTo(TAU / 8);
  });

  it('devuelve 0 con cuentas inválidas', () => {
    expect(segmentAngle(0)).toBe(0);
    expect(segmentAngle(-3)).toBe(0);
  });
});

describe('normalizeAngle', () => {
  it('lleva cualquier ángulo a [0, 2PI)', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(TAU)).toBeCloseTo(0);
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(3 * TAU + 1)).toBeCloseTo(1);
  });
});

describe('targetRotation + indexAtPointer', () => {
  it('la rotación calculada deja el segmento elegido bajo la aguja', () => {
    for (const count of [2, 3, 5, 8, 12]) {
      for (let index = 0; index < count; index += 1) {
        const rotation = targetRotation(index, count, 0.37, 6, 0.5);
        expect(indexAtPointer(rotation, count)).toBe(index);
      }
    }
  });

  it('funciona partiendo de rotaciones arbitrarias', () => {
    const starts = [0, 1.1, -2.4, 17.9, 100];
    for (const start of starts) {
      const rotation = targetRotation(3, 8, start, 4, 0.5);
      expect(indexAtPointer(rotation, 8)).toBe(3);
      expect(rotation).toBeGreaterThan(start);
    }
  });

  it('siempre gira hacia adelante al menos las vueltas pedidas', () => {
    const rotation = targetRotation(0, 8, 0, 6, 0.5);
    expect(rotation).toBeGreaterThanOrEqual(6 * TAU);
  });

  it('acota el jitter para no caer en el borde del segmento', () => {
    expect(indexAtPointer(targetRotation(2, 8, 0, 3, 0), 8)).toBe(2);
    expect(indexAtPointer(targetRotation(2, 8, 0, 3, 1), 8)).toBe(2);
  });

  it('no cambia la rotación si no hay segmentos', () => {
    expect(targetRotation(0, 0, 1.5)).toBe(1.5);
    expect(indexAtPointer(1.5, 0)).toBe(-1);
  });
});

describe('easeOutQuart', () => {
  it('va de 0 a 1 y desacelera', () => {
    expect(easeOutQuart(0)).toBe(0);
    expect(easeOutQuart(1)).toBe(1);
    expect(easeOutQuart(0.5)).toBeGreaterThan(0.5);
  });

  it('acota valores fuera de rango', () => {
    expect(easeOutQuart(-1)).toBe(0);
    expect(easeOutQuart(2)).toBe(1);
  });
});

describe('rotationAt', () => {
  it('empieza en el origen y acaba en el destino', () => {
    expect(rotationAt(0, 10, 0, 1000)).toBe(0);
    expect(rotationAt(0, 10, 1000, 1000)).toBe(10);
    expect(rotationAt(0, 10, 5000, 1000)).toBe(10);
  });

  it('devuelve el destino si la duración es 0', () => {
    expect(rotationAt(0, 7, 0, 0)).toBe(7);
  });
});

describe('labelFontSize', () => {
  it('reduce el tamaño cuando hay más segmentos', () => {
    expect(labelFontSize(200, 12)).toBeLessThan(labelFontSize(200, 6));
  });

  it('nunca baja de 10 px', () => {
    expect(labelFontSize(40, 12)).toBeGreaterThanOrEqual(10);
  });
});

describe('wrapLabel', () => {
  it('parte por palabras respetando el ancho', () => {
    expect(wrapLabel('Diagnóstico neurocognitivo gratis', 14)).toEqual([
      'Diagnóstico',
      'neurocognitivo',
      'gratis',
    ]);
  });

  it('devuelve una línea si cabe', () => {
    expect(wrapLabel('Beca 30%', 20)).toEqual(['Beca 30%']);
  });

  it('recorta con elipsis al superar el máximo de líneas', () => {
    const lines = wrapLabel('uno dos tres cuatro cinco seis siete', 5, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]?.endsWith('…')).toBe(true);
  });

  it('tolera cadenas vacías', () => {
    expect(wrapLabel('   ', 10)).toEqual([]);
  });
});
