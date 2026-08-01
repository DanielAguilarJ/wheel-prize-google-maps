import type { PlayRecord, Prize } from './types';
import { generateCode, secureRandom } from './prizes';

/** Datos que captura el formulario antes de girar. */
export interface LeadInput {
  readonly name: string;
  readonly contact: string;
  readonly programId: string;
  readonly audience: string;
  readonly consent: boolean;
  /** Origen del QR (sede, asesor, cartel). Opcional. */
  readonly source?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: Readonly<Record<string, string>>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Normaliza espacios y recorta longitud para evitar basura en el CSV. */
export function sanitizeText(value: string, maxLength = 120): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** Teléfono mexicano: 10 dígitos, con o sin lada +52. */
export function isValidMexicanPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return true;
  if (digits.length === 12 && digits.startsWith('52')) return true;
  if (digits.length === 13 && digits.startsWith('521')) return true;
  return false;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Un contacto es válido si es email o teléfono. */
export function isValidContact(value: string): boolean {
  return isValidEmail(value) || isValidMexicanPhone(value);
}

export interface LeadRules {
  readonly requireLead: boolean;
  readonly requireConsent: boolean;
}

export function validateLead(input: LeadInput, rules: LeadRules): ValidationResult {
  const errors: Record<string, string> = {};

  if (rules.requireLead) {
    if (sanitizeText(input.name).length < 2) {
      errors.name = 'Escribe tu nombre (mínimo 2 letras).';
    }
    if (!isValidContact(input.contact)) {
      errors.contact = 'Necesitamos un correo válido o un celular a 10 dígitos.';
    }
    if (!input.programId) {
      errors.programId = 'Elige el programa que te interesa.';
    }
  }
  if (rules.requireConsent && !input.consent) {
    errors.consent = 'Marca la casilla para poder guardar tus datos y entregarte el premio.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Identificador de jugada legible y ordenable. */
export function createPlayId(now: Date, randomFn: () => number = secureRandom): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.floor(randomFn() * 1_679_616)
    .toString(36)
    .padStart(4, '0');
  return `p${stamp}${suffix}`;
}

/** Construye el registro inmutable de la jugada. */
export function buildPlayRecord(params: {
  readonly prize: Prize;
  readonly lead: LeadInput;
  readonly now: Date;
  readonly randomFn?: () => number;
}): PlayRecord {
  const randomFn = params.randomFn ?? secureRandom;
  return {
    id: createPlayId(params.now, randomFn),
    at: params.now.toISOString(),
    prizeId: params.prize.id,
    prizeLabel: params.prize.label,
    code: generateCode(randomFn),
    name: sanitizeText(params.lead.name, 80),
    contact: sanitizeText(params.lead.contact, 80),
    programId: sanitizeText(params.lead.programId, 60),
    audience: sanitizeText(params.lead.audience, 30),
    source: sanitizeText(params.lead.source ?? 'directo', 40),
    consent: Boolean(params.lead.consent),
    rating: null,
    feedback: '',
    reviewOpened: false,
    redeemed: false,
  };
}

/** Enlace de WhatsApp con mensaje prellenado, ya codificado. */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Mensaje que el ganador envía por WhatsApp para canjear su premio. */
export function redeemMessage(play: PlayRecord, institute: string): string {
  return (
    `¡Hola ${institute}! Gané "${play.prizeLabel}" en la ruleta UltraGiro. ` +
    `Mi código es ${play.code}. Me interesa el programa ${play.programId || 'por definir'}. ` +
    `Mi nombre es ${play.name || 'sin nombre'}.`
  );
}

/**
 * Enlace de reseña de Google. Sólo se aceptan URLs https de dominios de Google
 * para no redirigir a un sitio arbitrario si la configuración se corrompe.
 */
export function safeGoogleReviewUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    const allowed =
      host === 'g.page' ||
      host === 'goo.gl' ||
      host === 'maps.app.goo.gl' ||
      host.endsWith('.google.com') ||
      host === 'google.com' ||
      /\.google\.[a-z.]{2,6}$/.test(host);
    return allowed ? parsed.toString() : null;
  } catch {
    return null;
  }
}
