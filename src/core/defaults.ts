import type { AppConfig, Prize, ProgramOption } from './types';

/**
 * Configuración por defecto de UltraGiro para WorldBrain México.
 * Todo es editable desde el panel de administración (admin.html) y queda
 * guardado en el navegador. Aquí sólo viven los valores iniciales.
 */

export const DEFAULT_PRIZES: readonly Prize[] = Object.freeze([
  Object.freeze({
    id: 'diagnostico',
    label: 'Diagnóstico neurocognitivo GRATIS',
    icon: '🧠',
    weight: 22,
    kind: 'diagnostico',
    detail:
      'Sesión de diagnóstico y clase muestra de 45 minutos sin costo, con reporte de resultados para el alumno.',
    enabled: true,
  }),
  Object.freeze({
    id: 'inscripcion-0',
    label: 'Inscripción sin costo',
    icon: '🎓',
    weight: 8,
    kind: 'descuento',
    detail:
      'Exención del pago de inscripción al contratar cualquier programa. No acumulable con otras promociones.',
    enabled: true,
  }),
  Object.freeze({
    id: 'desc-15',
    label: '-15% en tu programa',
    icon: '💥',
    weight: 16,
    kind: 'descuento',
    detail: 'Descuento del 15% sobre el primer mes del programa que elijas.',
    enabled: true,
  }),
  Object.freeze({
    id: 'clase-extra',
    label: '1 clase extra de regalo',
    icon: '⏱️',
    weight: 18,
    kind: 'clase',
    detail: 'Una sesión adicional de regalo dentro del primer mes de tu programa.',
    enabled: true,
  }),
  Object.freeze({
    id: 'kit-soroban',
    label: 'Ábaco Soroban de regalo',
    icon: '🧮',
    weight: 8,
    kind: 'material',
    detail:
      'Ábaco Soroban físico incluido al inscribirte a MatheKids o JuniorMath. Sujeto a existencias.',
    enabled: true,
  }),
  Object.freeze({
    id: 'taller-memoria',
    label: 'Taller de Memoria Prodigiosa',
    icon: '🃏',
    weight: 12,
    kind: 'clase',
    detail: 'Acceso a un taller grupal de 90 minutos de técnicas de memoria.',
    enabled: true,
  }),
  Object.freeze({
    id: 'guia-fotolectura',
    label: 'Guía de Fotolectura (PDF)',
    icon: '📖',
    weight: 12,
    kind: 'digital',
    detail:
      'Guía descargable con 7 ejercicios para duplicar tu velocidad de lectura en 14 días.',
    enabled: true,
  }),
  Object.freeze({
    id: 'beca-parcial',
    label: 'Beca 30% (1 mes)',
    icon: '🏆',
    weight: 4,
    kind: 'descuento',
    detail:
      'Beca del 30% aplicable al primer mes. Cupo limitado, sujeta a disponibilidad del grupo.',
    enabled: true,
  }),
]);

export const DEFAULT_PROGRAMS: readonly ProgramOption[] = Object.freeze([
  Object.freeze({
    id: 'lectoescritura',
    name: 'Lectoescritura',
    audience: 'ninos',
    icon: '✏️',
    summary: 'Lectura fluida, comprensión y confianza para niñas y niños de 4 a 8 años.',
  }),
  Object.freeze({
    id: 'mathekids',
    name: 'MatheKids',
    audience: 'ninos',
    icon: '🧮',
    summary: 'Cálculo mental con ábaco Soroban para niños de 6 a 12 años.',
  }),
  Object.freeze({
    id: 'juniormath',
    name: 'JuniorMath',
    audience: 'ninos',
    icon: '➗',
    summary: 'Bases matemáticas sólidas con acompañamiento personalizado.',
  }),
  Object.freeze({
    id: 'fastkids',
    name: 'FastKids',
    audience: 'ninos',
    icon: '🗣️',
    summary: 'Inglés para niños y jóvenes en grupos de máximo 7 alumnos.',
  }),
  Object.freeze({
    id: 'robotics-code',
    name: 'Robotics Code',
    audience: 'ninos',
    icon: '🤖',
    summary: 'Scratch, Python, Arduino e introducción a IA.',
  }),
  Object.freeze({
    id: 'ciencia-astronomia',
    name: 'Ciencia y Astronomía',
    audience: 'ninos',
    icon: '🔭',
    summary: 'Pensamiento científico y curiosidad guiada por proyectos.',
  }),
  Object.freeze({
    id: 'homeschool',
    name: 'Homeschool',
    audience: 'ninos',
    icon: '🏠',
    summary: 'Acompañamiento académico de primaria a preparatoria.',
  }),
  Object.freeze({
    id: 'fotolectura',
    name: 'Fotolectura',
    audience: 'jovenes-adultos',
    icon: '📚',
    summary: 'Lectura rápida y comprensión: entrenamiento intensivo.',
  }),
  Object.freeze({
    id: 'memoria-prodigiosa',
    name: 'Memoria Prodigiosa',
    audience: 'jovenes-adultos',
    icon: '🃏',
    summary: 'Técnicas de retención y recuperación de información.',
  }),
  Object.freeze({
    id: 'neurocomunicacion',
    name: 'Neurocomunicación',
    audience: 'jovenes-adultos',
    icon: '🎙️',
    summary: 'Comunicación, expresión y desarrollo humano.',
  }),
  Object.freeze({
    id: 'grandes-lideres',
    name: 'Grandes Líderes',
    audience: 'jovenes-adultos',
    icon: '🦁',
    summary: 'Liderazgo, oratoria, confianza y trabajo en equipo.',
  }),
  Object.freeze({
    id: 'redaccion-ejecutiva',
    name: 'Redacción Ejecutiva',
    audience: 'jovenes-adultos',
    icon: '🖊️',
    summary: 'Escritura profesional y claridad comunicativa.',
  }),
  Object.freeze({
    id: 'admision-universitaria',
    name: 'Admisión Universitaria',
    audience: 'jovenes-adultos',
    icon: '🎯',
    summary: 'Preparación para exámenes de ingreso.',
  }),
  Object.freeze({
    id: 'universidad-dominical',
    name: 'Universidad Dominical',
    audience: 'jovenes-adultos',
    icon: '📅',
    summary: 'Acompañamiento académico flexible para adultos que trabajan.',
  }),
  Object.freeze({
    id: 'regularizacion-express',
    name: 'Regularización Express',
    audience: 'jovenes-adultos',
    icon: '⚡',
    summary: 'Refuerzo escolar focalizado y medible.',
  }),
  Object.freeze({
    id: 'alfa-cash',
    name: 'ALFA-CASH',
    audience: 'jovenes-adultos',
    icon: '💠',
    summary: 'Programa de educación financiera y toma de decisiones.',
  }),
  Object.freeze({
    id: 'otro',
    name: 'Aún no lo sé / quiero orientación',
    audience: 'jovenes-adultos',
    icon: '❓',
    summary: 'Te ayudamos a elegir la ruta según tu diagnóstico.',
  }),
]);

export const DEFAULT_CONFIG: AppConfig = Object.freeze({
  brand: Object.freeze({
    institute: 'WorldBrain México',
    legalName: 'CWBMX, S.C.',
    site: 'ultravelozmente.com',
    city: 'Cuautitlán Izcalli, Estado de México',
    phone: '+52 55 0000 0000',
    email: 'contacto@ultravelozmente.com',
    hours: 'Lunes a sábado, 9:00 a 20:00',
    // Enlace corto oficial del Perfil de Empresa de WorldBrain.
    // Se prefiere sobre search.google.com/local/writereview porque el dominio
    // g.page está registrado como App Link / Universal Link: en un teléfono con
    // Google Maps instalado, el sistema entrega el enlace a la app —donde la
    // persona ya tiene su sesión abierta— en lugar de pedirle iniciar sesión en
    // el navegador. Redirige a writereview?placeid=ChIJA_UWvz4e0oURXT3jeebn4-Y,
    // es decir, al cuadro para escribir, no a la lista de reseñas de otros.
    googleReviewUrl: 'https://g.page/r/CV0943nm5-PmEBM/review',
    wheelPublicUrl: 'https://ultravelozmente.com/ruleta',
  }),
  rules: Object.freeze({
    cooldownHours: 24,
    requireLead: true,
    requireConsent: true,
    prizeValidityDays: 30,
    spinDurationMs: 5200,
  }),
  prizes: DEFAULT_PRIZES,
  programs: DEFAULT_PROGRAMS,
});

/** Paleta por categoría de premio (se usa para pintar la ruleta). */
export const PRIZE_COLORS: Readonly<Record<string, string>> = Object.freeze({
  diagnostico: '#6D28D9',
  descuento: '#DB2777',
  clase: '#0E7490',
  material: '#B45309',
  digital: '#15803D',
  sorpresa: '#4338CA',
});

export const WHEEL_FALLBACK_COLORS: readonly string[] = Object.freeze([
  '#6D28D9',
  '#DB2777',
  '#0E7490',
  '#B45309',
  '#15803D',
  '#4338CA',
  '#BE123C',
  '#0F766E',
]);
