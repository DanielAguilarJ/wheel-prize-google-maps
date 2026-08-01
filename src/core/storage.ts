import type { AppConfig, PlayRecord } from './types';
import { DEFAULT_CONFIG } from './defaults';

/**
 * Persistencia local. UltraGiro es de uso propio y sin servidor:
 * la configuración y las jugadas viven en localStorage del dispositivo.
 * Exporta a CSV con frecuencia (panel admin) para no perder datos.
 */

export const CONFIG_KEY = 'ultragiro.config.v1';
export const PLAYS_KEY = 'ultragiro.plays.v1';
export const LAST_SPIN_KEY = 'ultragiro.lastSpin.v1';

/** Contrato mínimo de almacenamiento, para poder inyectar un doble en pruebas. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Store en memoria: se usa en pruebas y como respaldo si localStorage no existe. */
export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

let fallbackStore: KeyValueStore | null = null;

/** localStorage cuando está disponible (puede fallar en modo privado); memoria si no. */
export function defaultStore(): KeyValueStore {
  try {
    const probe = '__ultragiro_probe__';
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    fallbackStore ??= createMemoryStore();
    return fallbackStore;
  }
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Une la configuración guardada con los valores por defecto.
 * Así, si se añaden campos nuevos al código, las instalaciones viejas siguen funcionando.
 */
export function mergeConfig(stored: unknown): AppConfig {
  if (!stored || typeof stored !== 'object') return DEFAULT_CONFIG;
  const partial = stored as Partial<AppConfig>;
  const brand = { ...DEFAULT_CONFIG.brand, ...(partial.brand ?? {}) };
  return {
    brand: {
      ...brand,
      // Si quedó guardado el marcador de instalación, se usa el enlace real.
      googleReviewUrl: isPlaceholderReviewUrl(brand.googleReviewUrl)
        ? DEFAULT_CONFIG.brand.googleReviewUrl
        : brand.googleReviewUrl,
    },
    rules: { ...DEFAULT_CONFIG.rules, ...(partial.rules ?? {}) },
    prizes:
      Array.isArray(partial.prizes) && partial.prizes.length > 0
        ? partial.prizes.map((prize) => ({ ...prize }))
        : DEFAULT_CONFIG.prizes,
    programs:
      Array.isArray(partial.programs) && partial.programs.length > 0
        ? partial.programs.map((program) => ({ ...program }))
        : DEFAULT_CONFIG.programs,
  };
}

/** Detecta un enlace de reseñas sin configurar (marcador o vacío). */
export function isPlaceholderReviewUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url.trim() === '') return true;
  return /TU_PLACE_ID|PLACE_ID_AQUI|placeid=$/i.test(url);
}

export function loadConfig(store: KeyValueStore = defaultStore()): AppConfig {
  return mergeConfig(safeParse<AppConfig>(store.getItem(CONFIG_KEY)));
}

export function saveConfig(config: AppConfig, store: KeyValueStore = defaultStore()): AppConfig {
  store.setItem(CONFIG_KEY, JSON.stringify(config));
  return config;
}

export function resetConfig(store: KeyValueStore = defaultStore()): AppConfig {
  store.removeItem(CONFIG_KEY);
  return DEFAULT_CONFIG;
}

export function loadPlays(store: KeyValueStore = defaultStore()): readonly PlayRecord[] {
  const parsed = safeParse<PlayRecord[]>(store.getItem(PLAYS_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((play) => play && typeof play.id === 'string' && typeof play.at === 'string');
}

export function savePlays(
  plays: readonly PlayRecord[],
  store: KeyValueStore = defaultStore(),
): readonly PlayRecord[] {
  store.setItem(PLAYS_KEY, JSON.stringify(plays));
  return plays;
}

/** Agrega una jugada al histórico y devuelve la lista nueva (sin mutar la anterior). */
export function appendPlay(
  play: PlayRecord,
  store: KeyValueStore = defaultStore(),
): readonly PlayRecord[] {
  const next = [...loadPlays(store), play];
  return savePlays(next, store);
}

/** Actualiza una jugada por id (por ejemplo, marcar premio entregado). */
export function updatePlay(
  playId: string,
  patch: Partial<PlayRecord>,
  store: KeyValueStore = defaultStore(),
): readonly PlayRecord[] {
  const next = loadPlays(store).map((play) =>
    play.id === playId ? { ...play, ...patch, id: play.id } : play,
  );
  return savePlays(next, store);
}

export function clearPlays(store: KeyValueStore = defaultStore()): void {
  store.removeItem(PLAYS_KEY);
}

export function markSpin(at: Date, store: KeyValueStore = defaultStore()): void {
  store.setItem(LAST_SPIN_KEY, at.toISOString());
}

export function lastSpinAt(store: KeyValueStore = defaultStore()): Date | null {
  const raw = store.getItem(LAST_SPIN_KEY);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface CooldownState {
  readonly blocked: boolean;
  readonly remainingMs: number;
}

/**
 * Anti-abuso simple por dispositivo: evita que la misma persona gire sin parar.
 * No es seguridad fuerte (se puede limpiar el navegador); es suficiente para uso en sitio.
 */
export function cooldownState(
  now: Date,
  cooldownHours: number,
  store: KeyValueStore = defaultStore(),
): CooldownState {
  if (cooldownHours <= 0) return { blocked: false, remainingMs: 0 };
  const last = lastSpinAt(store);
  if (!last) return { blocked: false, remainingMs: 0 };
  const elapsed = now.getTime() - last.getTime();
  const window = cooldownHours * 60 * 60 * 1000;
  if (elapsed >= window || elapsed < 0) return { blocked: false, remainingMs: 0 };
  return { blocked: true, remainingMs: window - elapsed };
}
