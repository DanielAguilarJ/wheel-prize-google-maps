import { describe, expect, it } from 'vitest';
import { buildQrUrl, normalizeSource } from './qr-url';

describe('normalizeSource', () => {
  it('quita acentos, espacios y mayúsculas', () => {
    expect(normalizeSource('Recepción Principal')).toBe('recepcion-principal');
  });

  it('elimina caracteres peligrosos', () => {
    expect(normalizeSource('aula/3?x=<script>')).toBe('aula-3-x-script');
  });

  it('recorta a 24 caracteres', () => {
    expect(normalizeSource('a'.repeat(50))).toHaveLength(24);
  });

  it('devuelve cadena vacía si no queda nada útil', () => {
    expect(normalizeSource('///')).toBe('');
  });
});

describe('buildQrUrl', () => {
  const base = 'https://ultravelozmente.com/ruleta';

  it('añade origen y programa', () => {
    expect(buildQrUrl(base, 'recepcion', 'mathekids')).toBe(
      'https://ultravelozmente.com/ruleta?origen=recepcion&programa=mathekids',
    );
  });

  it('omite parámetros vacíos', () => {
    expect(buildQrUrl(base, '', '')).toBe('https://ultravelozmente.com/ruleta');
  });

  it('conserva parámetros ya presentes en la base', () => {
    expect(buildQrUrl(`${base}?utm=cartel`, 'feria', '')).toBe(
      'https://ultravelozmente.com/ruleta?utm=cartel&origen=feria',
    );
  });

  it('sobrescribe un origen previo en lugar de duplicarlo', () => {
    expect(buildQrUrl(`${base}?origen=viejo`, 'nuevo', '')).toBe(
      'https://ultravelozmente.com/ruleta?origen=nuevo',
    );
  });

  it('devuelve el texto tal cual si la URL es inválida', () => {
    expect(buildQrUrl('no-es-una-url', 'recepcion', '')).toBe('no-es-una-url');
  });

  it('normaliza la etiqueta de origen', () => {
    expect(buildQrUrl(base, 'Feria Izcalli', '')).toContain('origen=feria-izcalli');
  });
});
