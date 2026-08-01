/**
 * PLANTILLA DE CONTENIDO — no son reseñas reales.
 * Sustituye estos textos por testimonios auténticos con autorización por escrito
 * del alumno o del tutor, o elimina la sección de la landing.
 */

export interface SampleReview {
  readonly title: string;
  readonly text: string;
  readonly who: string;
  readonly context: string;
}

export const SAMPLE_REVIEWS: readonly SampleReview[] = Object.freeze([
  Object.freeze({
    title: 'Pasó de odiar las matemáticas a pedir su ábaco',
    text: 'Mi hija llevaba dos años atorada en multiplicaciones. Con MatheKids empezó a resolver de memoria y ahora ella pide practicar en casa.',
    who: 'Mamá de alumna de 9 años',
    context: 'MatheKids · Cuautitlán Izcalli',
  }),
  Object.freeze({
    title: 'Leo el triple y entiendo más',
    text: 'Entré a Fotolectura porque en la universidad no me alcanzaba el tiempo para las lecturas. Ahora termino un capítulo en la mitad y sí me acuerdo de lo que leí.',
    who: 'Estudiante universitario',
    context: 'Fotolectura · Adultos',
  }),
  Object.freeze({
    title: 'El diagnóstico gratis nos abrió los ojos',
    text: 'Fuimos por la clase muestra sin muchas expectativas. Nos explicaron exactamente en qué estaba fallando mi hijo con la lectura y qué hacer. Nos quedamos.',
    who: 'Papá de alumno de 7 años',
    context: 'Lectoescritura · Diagnóstico',
  }),
  Object.freeze({
    title: 'Perdió el miedo a hablar en público',
    text: 'En Grandes Líderes le tocó exponer desde la primera semana. Hoy participa en la escolta y da avisos frente a todo el grupo.',
    who: 'Mamá de alumno de 12 años',
    context: 'Grandes Líderes',
  }),
  Object.freeze({
    title: 'Entró a la universidad que quería',
    text: 'El curso de Admisión Universitaria me ordenó el estudio y me quitó la ansiedad de los simulacros. Pasé en la primera vuelta.',
    who: 'Egresada de preparatoria',
    context: 'Admisión Universitaria',
  }),
  Object.freeze({
    title: 'Memorizar dejó de ser un martirio',
    text: 'Soy médico residente y necesitaba retener muchísima información. Las técnicas de Memoria Prodigiosa me cambiaron la forma de estudiar.',
    who: 'Profesional de la salud',
    context: 'Memoria Prodigiosa',
  }),
  Object.freeze({
    title: 'Grupos chicos, atención de verdad',
    text: 'Siete niños por grupo en FastKids se nota: la maestra sabe qué le cuesta a cada uno y lo trabaja en la sesión.',
    who: 'Mamá de alumna de 8 años',
    context: 'FastKids · Inglés',
  }),
  Object.freeze({
    title: 'Robótica los engancha con la escuela',
    text: 'Empezó en Scratch y ya está programando en Python. Lo mejor: ahora le gusta la parte de matemáticas de la escuela.',
    who: 'Papá de alumno de 11 años',
    context: 'Robotics Code',
  }),
  Object.freeze({
    title: 'Regularización que sí se notó en boleta',
    text: 'Llegamos con tres materias reprobadas. Con Regularización Express recuperó dos en un mes y la tercera en el siguiente periodo.',
    who: 'Mamá de alumno de secundaria',
    context: 'Regularización Express',
  }),
]);
