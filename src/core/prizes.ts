import type { Prize } from './types';

/** Premios activos y con peso mayor a cero: los únicos que pueden salir sorteados. */
export function eligiblePrizes(prizes: readonly Prize[]): readonly Prize[] {
  return prizes.filter((p) => p.enabled && p.weight > 0);
}

/** Suma de pesos de los premios elegibles. */
export function totalWeight(prizes: readonly Prize[]): number {
  return eligiblePrizes(prizes).reduce((sum, p) => sum + p.weight, 0);
}

/**
 * Probabilidad real de cada premio, en porcentaje (0-100).
 * Los premios no elegibles reportan 0.
 */
export function probabilities(prizes: readonly Prize[]): readonly { id: string; percent: number }[] {
  const total = totalWeight(prizes);
  return prizes.map((p) => ({
    id: p.id,
    percent: total === 0 || !p.enabled || p.weight <= 0 ? 0 : (p.weight / total) * 100,
  }));
}

/**
 * Selección ponderada determinista a partir de un número aleatorio dado.
 * `random` debe estar en [0, 1). Se inyecta para poder testear sin azar.
 */
export function pickPrizeWith(prizes: readonly Prize[], random: number): Prize | null {
  const pool = eligiblePrizes(prizes);
  if (pool.length === 0) return null;

  const total = pool.reduce((sum, p) => sum + p.weight, 0);
  const clamped = Number.isFinite(random) ? Math.min(Math.max(random, 0), 0.999999999) : 0;
  let threshold = clamped * total;

  for (const prize of pool) {
    threshold -= prize.weight;
    if (threshold < 0) return prize;
  }
  return pool[pool.length - 1] ?? null;
}

/** Selección ponderada usando aleatoriedad criptográfica cuando está disponible. */
export function pickPrize(prizes: readonly Prize[]): Prize | null {
  return pickPrizeWith(prizes, secureRandom());
}

/** Número en [0,1) usando crypto.getRandomValues, con Math.random como respaldo. */
export function secureRandom(): number {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    cryptoObj.getRandomValues(buffer);
    return (buffer[0] ?? 0) / 2 ** 32;
  }
  return Math.random();
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I, O, 0, 1

/**
 * Código de canje legible: WB-XXXX-XXXX.
 * `randomFn` se inyecta para pruebas deterministas.
 */
export function generateCode(randomFn: () => number = secureRandom, prefix = 'WB'): string {
  const block = (): string =>
    Array.from({ length: 4 }, () => {
      const index = Math.floor(randomFn() * CODE_ALPHABET.length) % CODE_ALPHABET.length;
      return CODE_ALPHABET[index] ?? 'X';
    }).join('');
  return `${prefix}-${block()}-${block()}`;
}

export interface PrizeValidationIssue {
  readonly prizeId: string | null;
  readonly message: string;
}

/** Valida la lista de premios antes de guardarla desde el panel admin. */
export function validatePrizes(prizes: readonly Prize[]): readonly PrizeValidationIssue[] {
  const issues: PrizeValidationIssue[] = [];

  if (prizes.length < 2) {
    issues.push({ prizeId: null, message: 'La ruleta necesita al menos 2 premios.' });
  }
  if (prizes.length > 12) {
    issues.push({
      prizeId: null,
      message: 'Máximo 12 premios: con más segmentos la ruleta deja de leerse bien.',
    });
  }
  if (eligiblePrizes(prizes).length === 0) {
    issues.push({ prizeId: null, message: 'Debe haber al menos un premio activo con peso mayor a 0.' });
  }

  const seen = new Set<string>();
  for (const prize of prizes) {
    if (!prize.id.trim()) {
      issues.push({ prizeId: prize.id, message: 'Hay un premio sin identificador.' });
    }
    if (seen.has(prize.id)) {
      issues.push({ prizeId: prize.id, message: `Identificador duplicado: ${prize.id}` });
    }
    seen.add(prize.id);

    if (!prize.label.trim()) {
      issues.push({ prizeId: prize.id, message: `El premio ${prize.id} no tiene nombre visible.` });
    }
    if (prize.label.length > 42) {
      issues.push({
        prizeId: prize.id,
        message: `El nombre de "${prize.label}" es muy largo (máx. 42 caracteres).`,
      });
    }
    if (!Number.isFinite(prize.weight) || prize.weight < 0) {
      issues.push({ prizeId: prize.id, message: `Peso inválido en ${prize.id}: usa un número >= 0.` });
    }
  }

  return issues;
}

/** Devuelve una copia de la lista con un premio actualizado (sin mutar el original). */
export function updatePrize(
  prizes: readonly Prize[],
  prizeId: string,
  patch: Partial<Prize>,
): readonly Prize[] {
  return prizes.map((prize) => (prize.id === prizeId ? { ...prize, ...patch, id: prize.id } : prize));
}

/** Fecha de vencimiento del código de premio, en ISO. */
export function expiryDate(from: Date, validityDays: number): Date {
  const ms = from.getTime() + validityDays * 24 * 60 * 60 * 1000;
  return new Date(ms);
}
