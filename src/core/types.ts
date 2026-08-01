/**
 * Tipos del dominio UltraGiro.
 * Todos los objetos se tratan como inmutables: las funciones devuelven copias nuevas.
 */

/** Categoría del premio, usada para colorear la ruleta y segmentar estadísticas. */
export type PrizeKind =
  | 'diagnostico'
  | 'descuento'
  | 'clase'
  | 'material'
  | 'digital'
  | 'sorpresa';

export interface Prize {
  /** Identificador estable (no cambiar: se guarda en el histórico de jugadas). */
  readonly id: string;
  /** Texto corto que aparece en la ruleta. */
  readonly label: string;
  /** Emoji o icono corto. */
  readonly icon: string;
  /** Peso relativo de aparición. Debe ser >= 0. */
  readonly weight: number;
  /** Categoría para color y reportes. */
  readonly kind: PrizeKind;
  /** Explicación que ve el ganador (condiciones, vigencia, cómo canjear). */
  readonly detail: string;
  /** Si es false, el segmento se dibuja pero nunca se sortea. */
  readonly enabled: boolean;
}

export interface ProgramOption {
  readonly id: string;
  readonly name: string;
  readonly audience: 'ninos' | 'jovenes-adultos';
  readonly icon: string;
  readonly summary: string;
}

export interface BrandConfig {
  readonly institute: string;
  readonly legalName: string;
  readonly site: string;
  readonly city: string;
  readonly phone: string;
  readonly email: string;
  readonly hours: string;
  /** Enlace corto del Perfil de Empresa: única salida del recorrido. */
  readonly googleReviewUrl: string;
  /** URL pública donde se publica la ruleta (para el QR del cartel). */
  readonly wheelPublicUrl: string;
}

export interface RulesConfig {
  /** Horas que deben pasar antes de que el mismo dispositivo pueda volver a girar. */
  readonly cooldownHours: number;
  /** Exigir datos de contacto antes de girar. */
  readonly requireLead: boolean;
  /** Pedir consentimiento explícito de contacto (aviso de privacidad). */
  readonly requireConsent: boolean;
  /** Vigencia del código ganador, en días. */
  readonly prizeValidityDays: number;
  /** Duración de la animación de giro, en milisegundos. */
  readonly spinDurationMs: number;
}

export interface AppConfig {
  readonly brand: BrandConfig;
  readonly rules: RulesConfig;
  readonly prizes: readonly Prize[];
  readonly programs: readonly ProgramOption[];
}

/** Registro de una jugada. Es el dato que se exporta a CSV. */
export interface PlayRecord {
  readonly id: string;
  /** ISO 8601 */
  readonly at: string;
  readonly prizeId: string;
  readonly prizeLabel: string;
  readonly code: string;
  readonly name: string;
  readonly contact: string;
  readonly programId: string;
  readonly audience: string;
  /** Etiqueta de origen del QR: sede, asesor, cartel, feria... (parámetro ?origen=). */
  readonly source: string;
  readonly consent: boolean;
  /** Estrellas declaradas por el visitante (1-5) o null si no respondió. */
  readonly rating: number | null;
  /** Comentario privado cuando la valoración es baja. */
  readonly feedback: string;
  /** true si se abrió el enlace de reseña de Google. */
  readonly reviewOpened: boolean;
  /** true cuando el equipo marca el premio como entregado. */
  readonly redeemed: boolean;
}

export interface Stats {
  readonly total: number;
  readonly today: number;
  readonly last7Days: number;
  readonly last30Days: number;
  readonly leads: number;
  readonly consented: number;
  readonly reviewsOpened: number;
  readonly redeemed: number;
  readonly averageRating: number | null;
  readonly reviewRate: number;
  readonly byPrize: readonly { readonly prizeId: string; readonly label: string; readonly count: number }[];
  readonly byProgram: readonly { readonly programId: string; readonly count: number }[];
  readonly byDay: readonly { readonly day: string; readonly count: number }[];
}
