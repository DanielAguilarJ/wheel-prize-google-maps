import { describe, expect, it } from 'vitest';
import {
  appendPlay,
  clearPlays,
  cooldownState,
  createMemoryStore,
  isPlaceholderReviewUrl,
  isOutdatedReviewUrl,
  loadConfig,
  loadPlays,
  markSpin,
  mergeConfig,
  resetConfig,
  saveConfig,
  updatePlay,
  CONFIG_KEY,
  PLAYS_KEY,
} from './storage';
import { DEFAULT_CONFIG } from './defaults';
import type { PlayRecord } from './types';

function play(id: string, at: string, patch: Partial<PlayRecord> = {}): PlayRecord {
  return {
    id,
    at,
    prizeId: 'diagnostico',
    prizeLabel: 'Diagnóstico gratis',
    code: 'WB-AAAA-BBBB',
    name: 'Ana',
    contact: 'ana@example.com',
    programId: 'fotolectura',
    audience: 'jovenes-adultos',
    source: 'directo',
    consent: true,
    rating: 5,
    feedback: '',
    reviewOpened: false,
    redeemed: false,
    ...patch,
  };
}

describe('mergeConfig', () => {
  it('devuelve los valores por defecto con entradas inválidas', () => {
    expect(mergeConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(mergeConfig('texto')).toEqual(DEFAULT_CONFIG);
  });

  it('conserva campos nuevos del código y respeta los guardados', () => {
    const merged = mergeConfig({ brand: { institute: 'Otro Nombre' } });
    expect(merged.brand.institute).toBe('Otro Nombre');
    expect(merged.brand.site).toBe(DEFAULT_CONFIG.brand.site);
    expect(merged.prizes).toHaveLength(DEFAULT_CONFIG.prizes.length);
  });

  it('usa los premios por defecto si la lista guardada está vacía', () => {
    expect(mergeConfig({ prizes: [] }).prizes).toEqual(DEFAULT_CONFIG.prizes);
  });

  it('reemplaza un enlace de reseñas sin configurar por el real', () => {
    const merged = mergeConfig({
      brand: { googleReviewUrl: 'https://search.google.com/local/writereview?placeid=TU_PLACE_ID' },
    });
    expect(merged.brand.googleReviewUrl).toBe(DEFAULT_CONFIG.brand.googleReviewUrl);
    expect(merged.brand.googleReviewUrl).toContain('g.page');
  });

  it('migra el enlace largo de versiones anteriores al enlace corto actual', () => {
    const legacy = 'https://search.google.com/local/writereview?placeid=ChIJA_UWvz4e0oURXT3jeebn4-Y';
    expect(mergeConfig({ brand: { googleReviewUrl: legacy } }).brand.googleReviewUrl).toBe(
      DEFAULT_CONFIG.brand.googleReviewUrl,
    );
  });

  it('respeta un enlace de reseñas ya configurado', () => {
    const custom = 'https://g.page/r/OtroNegocio123/review';
    expect(mergeConfig({ brand: { googleReviewUrl: custom } }).brand.googleReviewUrl).toBe(custom);
  });
});

describe('isPlaceholderReviewUrl', () => {
  it('detecta marcadores y valores vacíos', () => {
    expect(isPlaceholderReviewUrl('')).toBe(true);
    expect(isPlaceholderReviewUrl('   ')).toBe(true);
    expect(isPlaceholderReviewUrl(undefined)).toBe(true);
    expect(isPlaceholderReviewUrl('https://search.google.com/local/writereview?placeid=TU_PLACE_ID')).toBe(true);
    expect(isPlaceholderReviewUrl('https://search.google.com/local/writereview?placeid=')).toBe(true);
  });

  it('acepta enlaces reales', () => {
    expect(isPlaceholderReviewUrl(DEFAULT_CONFIG.brand.googleReviewUrl)).toBe(false);
    expect(isPlaceholderReviewUrl('https://g.page/r/CabcDEF/review')).toBe(false);
  });
});

describe('isOutdatedReviewUrl', () => {
  it('marca los valores por defecto de versiones anteriores', () => {
    expect(
      isOutdatedReviewUrl('https://search.google.com/local/writereview?placeid=ChIJA_UWvz4e0oURXT3jeebn4-Y'),
    ).toBe(true);
  });

  it('no toca el enlace actual ni uno escrito a mano', () => {
    expect(isOutdatedReviewUrl(DEFAULT_CONFIG.brand.googleReviewUrl)).toBe(false);
    expect(isOutdatedReviewUrl('https://g.page/r/OtroNegocio123/review')).toBe(false);
  });
});

describe('enlace de reseña por defecto', () => {
  it('usa el enlace corto g.page, que en móvil abre la app de Maps', () => {
    const url = new URL(DEFAULT_CONFIG.brand.googleReviewUrl);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('g.page');
    expect(url.pathname).toBe('/r/CV0943nm5-PmEBM/review');
  });

  it('no apunta a /maps/place, donde se listan las reseñas de otras personas', () => {
    expect(DEFAULT_CONFIG.brand.googleReviewUrl).not.toContain('/maps/place');
  });
});

describe('loadConfig / saveConfig / resetConfig', () => {
  it('sobrevive a un JSON corrupto', () => {
    const store = createMemoryStore({ [CONFIG_KEY]: '{no-es-json' });
    expect(loadConfig(store)).toEqual(DEFAULT_CONFIG);
  });

  it('persiste y recupera cambios', () => {
    const store = createMemoryStore();
    const next = { ...DEFAULT_CONFIG, rules: { ...DEFAULT_CONFIG.rules, cooldownHours: 6 } };
    saveConfig(next, store);
    expect(loadConfig(store).rules.cooldownHours).toBe(6);
  });

  it('reset devuelve los valores de fábrica', () => {
    const store = createMemoryStore();
    saveConfig({ ...DEFAULT_CONFIG, rules: { ...DEFAULT_CONFIG.rules, cooldownHours: 1 } }, store);
    expect(resetConfig(store)).toEqual(DEFAULT_CONFIG);
    expect(loadConfig(store).rules.cooldownHours).toBe(DEFAULT_CONFIG.rules.cooldownHours);
  });
});

describe('histórico de jugadas', () => {
  it('empieza vacío', () => {
    expect(loadPlays(createMemoryStore())).toEqual([]);
  });

  it('agrega jugadas sin mutar la lista previa', () => {
    const store = createMemoryStore();
    const first = appendPlay(play('p1', '2026-03-01T10:00:00.000Z'), store);
    const second = appendPlay(play('p2', '2026-03-01T11:00:00.000Z'), store);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(2);
    expect(loadPlays(store).map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('actualiza una jugada por id y protege el id', () => {
    const store = createMemoryStore();
    appendPlay(play('p1', '2026-03-01T10:00:00.000Z'), store);
    updatePlay('p1', { redeemed: true, id: 'otro' } as Partial<PlayRecord>, store);
    const [updated] = loadPlays(store);
    expect(updated?.id).toBe('p1');
    expect(updated?.redeemed).toBe(true);
  });

  it('ignora registros basura guardados por error', () => {
    const store = createMemoryStore({ [PLAYS_KEY]: JSON.stringify([{ foo: 1 }, null]) });
    expect(loadPlays(store)).toEqual([]);
  });

  it('borra el histórico', () => {
    const store = createMemoryStore();
    appendPlay(play('p1', '2026-03-01T10:00:00.000Z'), store);
    clearPlays(store);
    expect(loadPlays(store)).toEqual([]);
  });
});

describe('cooldownState', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  it('no bloquea si nunca se giró', () => {
    expect(cooldownState(now, 24, createMemoryStore())).toEqual({ blocked: false, remainingMs: 0 });
  });

  it('bloquea dentro de la ventana y reporta el tiempo restante', () => {
    const store = createMemoryStore();
    markSpin(new Date('2026-03-01T06:00:00.000Z'), store);
    const state = cooldownState(now, 24, store);
    expect(state.blocked).toBe(true);
    expect(state.remainingMs).toBe(18 * 60 * 60 * 1000);
  });

  it('libera al cumplirse la ventana', () => {
    const store = createMemoryStore();
    markSpin(new Date('2026-02-28T12:00:00.000Z'), store);
    expect(cooldownState(now, 24, store).blocked).toBe(false);
  });

  it('cooldown 0 desactiva el bloqueo', () => {
    const store = createMemoryStore();
    markSpin(new Date('2026-03-01T11:59:00.000Z'), store);
    expect(cooldownState(now, 0, store).blocked).toBe(false);
  });

  it('ignora relojes adelantados (fecha futura guardada)', () => {
    const store = createMemoryStore();
    markSpin(new Date('2026-03-05T12:00:00.000Z'), store);
    expect(cooldownState(now, 24, store).blocked).toBe(false);
  });
});
