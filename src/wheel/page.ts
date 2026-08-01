import '../styles/base.css';
import '../styles/landing.css';
import '../styles/ruleta.css';

import { loadConfig, appendPlay, updatePlay, markSpin, cooldownState } from '../core/storage';
import { expiryDate, pickPrize } from '../core/prizes';
import {
  buildPlayRecord,
  redeemMessage,
  safeGoogleReviewUrl,
  validateLead,
  whatsappLink,
  type LeadInput,
} from '../core/lead';
import { formatRemaining, remainingUntil } from '../core/countdown';
import { Wheel } from './wheel';
import { clear, el, qs, qsa, scrollIntoViewSafe, setText, urlParam } from '../ui/dom';
import type { PlayRecord } from '../core/types';

const config = loadConfig();
const source = urlParam('origen') || 'directo';
const preselectedProgram = urlParam('programa', 60);

let currentPlay: PlayRecord | null = null;
let wheel: Wheel | null = null;

/* ------------------------------------------------------------------ *
 * Utilidades de pantalla
 * ------------------------------------------------------------------ */

type ScreenId = 'lead' | 'wheel' | 'result' | 'cooldown';

const SCREEN_STEP: Readonly<Record<ScreenId, number>> = {
  lead: 1,
  wheel: 2,
  result: 3,
  cooldown: 1,
};

function showScreen(id: ScreenId): void {
  for (const name of ['lead', 'wheel', 'result', 'cooldown'] as const) {
    const section = qs(`#screen-${name}`);
    if (section) section.hidden = name !== id;
  }
  const step = SCREEN_STEP[id];
  for (const dot of qsa('.play__dot')) {
    dot.classList.toggle('is-active', Number(dot.dataset.dot) <= step);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let toastTimer = 0;
function toast(message: string): void {
  const node = qs('#toast');
  if (!node) return;
  setText(node, message);
  node.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => node.classList.remove('is-visible'), 2600);
}

/* ------------------------------------------------------------------ *
 * Textos de marca
 * ------------------------------------------------------------------ */

function applyBrand(): void {
  for (const node of qsa('[data-institute]')) setText(node, config.brand.institute);
  for (const node of qsa('[data-legal-name]')) setText(node, config.brand.legalName);
  setText(qs('#review-hint-text'), ` ${config.brand.reviewHint}`);
  document.title = `Gira y gana · ${config.brand.institute}`;
}

/* ------------------------------------------------------------------ *
 * Formulario de captura
 * ------------------------------------------------------------------ */

function fillProgramSelect(): void {
  const select = qs<HTMLSelectElement>('#lead-program');
  if (!select) return;

  const groups: readonly { readonly id: 'ninos' | 'jovenes-adultos'; readonly label: string }[] = [
    { id: 'ninos', label: 'Niñas y niños' },
    { id: 'jovenes-adultos', label: 'Jóvenes y adultos' },
  ];

  for (const group of groups) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    for (const program of config.programs.filter((item) => item.audience === group.id)) {
      optgroup.appendChild(
        el('option', { text: `${program.icon} ${program.name}`, attrs: { value: program.id } }),
      );
    }
    select.appendChild(optgroup);
  }

  if (preselectedProgram && config.programs.some((program) => program.id === preselectedProgram)) {
    select.value = preselectedProgram;
  }
}

function showErrors(errors: Readonly<Record<string, string>>): void {
  for (const node of qsa('[data-error]')) {
    const key = node.dataset.error ?? '';
    setText(node, errors[key] ?? '');
  }
}

function readLead(): LeadInput {
  const programId = qs<HTMLSelectElement>('#lead-program')?.value ?? '';
  const audience =
    config.programs.find((program) => program.id === programId)?.audience ?? 'jovenes-adultos';
  return {
    name: qs<HTMLInputElement>('#lead-name')?.value ?? '',
    contact: qs<HTMLInputElement>('#lead-contact')?.value ?? '',
    programId,
    audience,
    consent: qs<HTMLInputElement>('#lead-consent')?.checked ?? false,
    source,
  };
}

function setupLeadForm(): void {
  const form = qs<HTMLFormElement>('#lead-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const lead = readLead();
    const result = validateLead(lead, config.rules);
    showErrors(result.errors);

    if (!result.valid) {
      const firstKey = Object.keys(result.errors)[0];
      scrollIntoViewSafe(qs<HTMLElement>(`[data-error="${firstKey}"]`));
      return;
    }

    setText(qs('#player-name'), lead.name.split(' ')[0] ?? 'visitante');
    showScreen('wheel');
    initWheel();
  });
}

/* ------------------------------------------------------------------ *
 * Ruleta
 * ------------------------------------------------------------------ */

function initWheel(): void {
  const canvas = qs<HTMLCanvasElement>('#play-wheel');
  if (!canvas || wheel) return;
  try {
    wheel = new Wheel({
      canvas,
      prizes: config.prizes,
      spinDurationMs: config.rules.spinDurationMs,
      turns: 6,
    });
  } catch (error) {
    setText(
      qs('#spin-status'),
      error instanceof Error ? error.message : 'Tu navegador no puede mostrar la ruleta.',
    );
    const button = qs<HTMLButtonElement>('#spin-button');
    if (button) button.disabled = true;
  }
}

function setupSpin(): void {
  const button = qs<HTMLButtonElement>('#spin-button');
  if (!button) return;

  button.addEventListener('click', () => {
    if (!wheel || wheel.isSpinning) return;

    const prize = pickPrize(config.prizes);
    if (!prize) {
      setText(qs('#spin-status'), 'No hay premios configurados. Avisa al personal.');
      return;
    }

    button.disabled = true;
    setText(qs('#spin-status'), 'Girando… ¡suerte!');

    wheel
      .spinTo(prize)
      .then(() => {
        const now = new Date();
        const record = buildPlayRecord({ prize, lead: readLead(), now });
        currentPlay = record;
        appendPlay(record);
        markSpin(now);
        renderResult(record, now);
        showScreen('result');
      })
      .catch(() => {
        setText(qs('#spin-status'), 'Algo interrumpió el giro. Inténtalo otra vez.');
        button.disabled = false;
      });
  });
}

/* ------------------------------------------------------------------ *
 * Resultado
 * ------------------------------------------------------------------ */

function renderResult(play: PlayRecord, now: Date): void {
  const prize = config.prizes.find((item) => item.id === play.prizeId);
  setText(qs('#prize-icon'), prize?.icon ?? '🎁');
  setText(qs('#prize-label'), play.prizeLabel);
  setText(qs('#prize-detail'), prize?.detail ?? '');
  setText(qs('#prize-code'), play.code);

  const expiry = expiryDate(now, config.rules.prizeValidityDays);
  setText(
    qs('#prize-expiry'),
    `Válido hasta el ${expiry.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })}`,
  );

  const claim = qs<HTMLAnchorElement>('#claim-wa');
  if (claim) {
    claim.href = whatsappLink(config.brand.whatsapp, redeemMessage(play, config.brand.institute));
  }

  const reviewUrl = safeGoogleReviewUrl(config.brand.googleReviewUrl);
  for (const selector of ['#review-link', '#review-link-alt']) {
    const anchor = qs<HTMLAnchorElement>(selector);
    if (!anchor) continue;
    if (reviewUrl) {
      anchor.href = reviewUrl;
      anchor.addEventListener('click', () => {
        if (currentPlay) {
          updatePlay(currentPlay.id, { reviewOpened: true });
        }
      });
    } else {
      anchor.setAttribute('aria-disabled', 'true');
      anchor.removeAttribute('href');
      anchor.textContent = 'Falta configurar el enlace de Google en el panel interno';
    }
  }
}

function setupRating(): void {
  const stars = qsa<HTMLButtonElement>('.rating__star');
  if (stars.length === 0) return;

  for (const star of stars) {
    star.addEventListener('click', () => {
      const value = Number(star.dataset.value ?? '0');
      for (const item of stars) {
        item.classList.toggle('is-on', Number(item.dataset.value) <= value);
      }
      if (currentPlay) {
        updatePlay(currentPlay.id, { rating: value });
      }

      const positive = value >= 5;
      const reviewBlock = qs('#review-block');
      const feedbackBlock = qs('#feedback-block');
      if (reviewBlock) reviewBlock.hidden = !positive;
      if (feedbackBlock) feedbackBlock.hidden = positive;
      scrollIntoViewSafe(positive ? reviewBlock : feedbackBlock);
    });
  }
}

function setupFeedback(): void {
  const button = qs<HTMLButtonElement>('#feedback-send');
  const textarea = qs<HTMLTextAreaElement>('#feedback-text');
  if (!button || !textarea) return;

  button.addEventListener('click', () => {
    const text = textarea.value.trim().slice(0, 600);
    if (text.length < 4) {
      toast('Escribe un poco más para poder ayudarte.');
      return;
    }
    if (currentPlay) {
      updatePlay(currentPlay.id, { feedback: text });
    }
    textarea.value = '';
    textarea.disabled = true;
    button.disabled = true;
    button.textContent = '✓ Comentario enviado';
    toast('Gracias. La dirección académica lo revisará.');
  });
}

function setupCopyCode(): void {
  const button = qs<HTMLButtonElement>('#copy-code');
  if (!button) return;
  button.addEventListener('click', async () => {
    const code = currentPlay?.code ?? '';
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast('Código copiado 📋');
    } catch {
      toast(`Tu código es ${code}`);
    }
  });
}

/* ------------------------------------------------------------------ *
 * Espera entre giros
 * ------------------------------------------------------------------ */

function setupCooldownScreen(remainingMs: number): void {
  const wa = qs<HTMLAnchorElement>('#cooldown-wa');
  if (wa) {
    wa.href = whatsappLink(
      config.brand.whatsapp,
      `Hola ${config.brand.institute}, tengo un código de premio de UltraGiro pendiente de canjear.`,
    );
  }

  const deadline = new Date(Date.now() + remainingMs);
  const tick = (): void => {
    const remaining = remainingUntil(new Date(), deadline);
    setText(qs('#cooldown-time'), formatRemaining(remaining));
    if (remaining.totalMs <= 0) {
      window.location.reload();
    }
  };
  tick();
  window.setInterval(tick, 1000);
  showScreen('cooldown');
}

/* ------------------------------------------------------------------ *
 * Arranque
 * ------------------------------------------------------------------ */

function boot(): void {
  applyBrand();
  fillProgramSelect();
  setupLeadForm();
  setupSpin();
  setupRating();
  setupFeedback();
  setupCopyCode();

  if (!config.rules.requireLead) {
    // Modo discreto: sin captura de datos, se va directo a la ruleta.
    const form = qs('#lead-form');
    if (form) clear(form);
    showScreen('wheel');
    initWheel();
    return;
  }

  const cooldown = cooldownState(new Date(), config.rules.cooldownHours);
  if (cooldown.blocked) {
    setupCooldownScreen(cooldown.remainingMs);
    return;
  }

  showScreen('lead');
}

boot();
