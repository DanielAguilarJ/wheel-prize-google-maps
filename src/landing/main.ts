import '../styles/base.css';
import '../styles/landing.css';

import { loadConfig } from '../core/storage';
import { pickPrize } from '../core/prizes';
import { DEFAULT_ASSUMPTIONS, projectImpact } from '../core/stats';
import { formatRemaining, nextDeadline, remainingUntil } from '../core/countdown';
import { whatsappLink } from '../core/lead';
import { Wheel } from '../wheel/wheel';
import { SAMPLE_REVIEWS } from './reviews.data';
import { clear, el, int, must, mxn, qs, qsa, setText } from '../ui/dom';
import type { ProgramOption } from '../core/types';

const config = loadConfig();

/* ------------------------------------------------------------------ *
 * Cuenta regresiva de la promoción
 * ------------------------------------------------------------------ */

const PROMO_ANCHOR = new Date('2026-01-01T00:00:00');

function startCountdown(): void {
  const hours = qs('[data-countdown="hours"]');
  const minutes = qs('[data-countdown="minutes"]');
  const seconds = qs('[data-countdown="seconds"]');
  if (!hours || !minutes || !seconds) return;

  const tick = (): void => {
    const now = new Date();
    const remaining = remainingUntil(now, nextDeadline(now, PROMO_ANCHOR, 24));
    const [h, m, s] = formatRemaining(remaining).split(':');
    setText(hours, h ?? '00');
    setText(minutes, m ?? '00');
    setText(seconds, s ?? '00');
  };

  tick();
  window.setInterval(tick, 1000);
}

/* ------------------------------------------------------------------ *
 * Marquesina de premios
 * ------------------------------------------------------------------ */

function renderMarquee(): void {
  const track = qs('#marquee-track');
  if (!track) return;

  const items = [
    ...config.prizes.filter((prize) => prize.enabled).map((prize) => `${prize.icon} ${prize.label}`),
    '⭐ Reseña 5★ en Google',
    '🧠 Diagnóstico sin costo',
    '🎯 Prueba tu suerte',
  ];

  clear(track);
  // Se duplica la lista para que la animación se vea continua.
  for (const text of [...items, ...items]) {
    track.appendChild(el('span', { text }));
  }
}

/* ------------------------------------------------------------------ *
 * Ruleta demo del hero
 * ------------------------------------------------------------------ */

function setupDemoWheel(): void {
  const canvas = qs<HTMLCanvasElement>('#demo-wheel');
  const button = qs<HTMLButtonElement>('#demo-spin');
  const result = qs('#demo-result');
  if (!canvas || !button || !result) return;

  let wheel: Wheel;
  try {
    wheel = new Wheel({
      canvas,
      prizes: config.prizes,
      spinDurationMs: 4200,
      turns: 5,
    });
  } catch (error) {
    setText(result, error instanceof Error ? error.message : 'No se pudo dibujar la ruleta.');
    button.disabled = true;
    return;
  }

  const stopIdle = wheel.idle(0.00035);

  button.addEventListener('click', () => {
    if (wheel.isSpinning) return;
    const prize = pickPrize(config.prizes);
    if (!prize) {
      setText(result, 'No hay premios activos. Configúralos en el panel interno.');
      return;
    }

    button.disabled = true;
    setText(result, 'Girando…');

    wheel
      .spinTo(prize)
      .then((won) => {
        setText(result, `${won.icon} ¡${won.label}! — así lo verá tu visitante.`);
      })
      .catch(() => {
        setText(result, 'La ruleta se interrumpió. Intenta de nuevo.');
      })
      .finally(() => {
        button.disabled = false;
      });
  });

  window.addEventListener('beforeunload', () => {
    stopIdle();
    wheel.destroy();
  });
}

/* ------------------------------------------------------------------ *
 * Programas por audiencia
 * ------------------------------------------------------------------ */

function programCard(program: ProgramOption): HTMLElement {
  return el('article', {
    className: 'program',
    children: [
      el('div', { className: 'program__icon', text: program.icon, attrs: { 'aria-hidden': 'true' } }),
      el('div', {
        children: [
          el('div', { className: 'program__name', text: program.name }),
          el('p', { className: 'program__summary', text: program.summary }),
        ],
      }),
    ],
  });
}

function renderPrograms(audience: string): void {
  const grid = qs('#programs-grid');
  if (!grid) return;
  const list = config.programs.filter(
    (program) => program.audience === audience && program.id !== 'otro',
  );
  clear(grid);
  for (const program of list) {
    grid.appendChild(programCard(program));
  }
}

function setupProgramTabs(): void {
  const tabs = qsa<HTMLButtonElement>('.tab');
  if (tabs.length === 0) return;

  const activate = (audience: string): void => {
    for (const tab of tabs) {
      tab.setAttribute('aria-selected', String(tab.dataset.audience === audience));
    }
    renderPrograms(audience);
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => activate(tab.dataset.audience ?? 'ninos'));
  }
  activate('ninos');
}

/* ------------------------------------------------------------------ *
 * Calculadora de impacto
 * ------------------------------------------------------------------ */

function setupCalculator(): void {
  const slider = qs<HTMLInputElement>('#visitors');
  if (!slider) return;

  const update = (): void => {
    const visitors = Number(slider.value);
    const projection = projectImpact(visitors, DEFAULT_ASSUMPTIONS);
    setText(qs('#visitors-out'), int(visitors));
    setText(qs('#out-spins'), int(projection.spins));
    setText(qs('#out-reviews'), int(projection.reviews));
    setText(qs('#out-leads'), int(projection.leads));
    setText(qs('#out-diagnostics'), int(projection.diagnostics));
    setText(qs('#out-enrollments'), int(projection.enrollments));
    setText(qs('#out-revenue'), mxn(projection.revenueMxn));
  };

  slider.addEventListener('input', update);
  update();
}

/* ------------------------------------------------------------------ *
 * Testimonios (plantilla)
 * ------------------------------------------------------------------ */

function renderReviews(): void {
  const grid = qs('#reviews-grid');
  if (!grid) return;
  clear(grid);

  for (const review of SAMPLE_REVIEWS) {
    grid.appendChild(
      el('article', {
        className: 'review',
        children: [
          el('span', { className: 'review__tag', text: '✓ Ejemplo de reseña' }),
          el('div', { className: 'stars', text: '★★★★★', attrs: { 'aria-hidden': 'true' } }),
          el('h3', { className: 'review__title', text: `“${review.title}”` }),
          el('p', { className: 'review__text', text: review.text }),
          el('div', {
            className: 'review__who',
            children: [
              el('span', {
                className: 'review__avatar',
                text: review.who.charAt(0).toUpperCase(),
                attrs: { 'aria-hidden': 'true' },
              }),
              el('span', { text: `${review.who} · ${review.context}` }),
            ],
          }),
        ],
      }),
    );
  }
}

/* ------------------------------------------------------------------ *
 * Contacto y detalles del pie
 * ------------------------------------------------------------------ */

function setupContact(): void {
  const message = `Hola ${config.brand.institute}, vengo de UltraGiro y quiero agendar el diagnóstico sin costo.`;
  const link = whatsappLink(config.brand.whatsapp, message);

  for (const selector of ['#wa-cta', '#footer-wa']) {
    const anchor = qs<HTMLAnchorElement>(selector);
    if (anchor) {
      anchor.href = link;
      anchor.rel = 'noopener';
      anchor.target = '_blank';
    }
  }

  const mail = qs<HTMLAnchorElement>('#footer-mail');
  if (mail) {
    mail.href = `mailto:${config.brand.email}`;
    mail.textContent = config.brand.email;
  }

  setText(qs('#footer-hours'), config.brand.hours);
  setText(qs('#year'), String(new Date().getFullYear()));
}

/* ------------------------------------------------------------------ *
 * Barra fija de llamada a la acción
 * ------------------------------------------------------------------ */

function setupStickyCta(): void {
  const bar = qs('#sticky-cta');
  if (!bar) return;
  const toggle = (): void => {
    bar.classList.toggle('is-visible', window.scrollY > 900);
  };
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
}

/* ------------------------------------------------------------------ *
 * Arranque
 * ------------------------------------------------------------------ */

function boot(): void {
  startCountdown();
  renderMarquee();
  setupDemoWheel();
  setupProgramTabs();
  setupCalculator();
  renderReviews();
  setupContact();
  setupStickyCta();
  // La marca puede cambiarse desde el panel: se refleja en el título del hero.
  setText(must('.brand__sub'), config.brand.institute);
}

boot();
