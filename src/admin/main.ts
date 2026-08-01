import '../styles/base.css';
import '../styles/admin.css';

import {
  clearPlays,
  loadConfig,
  loadPlays,
  saveConfig,
  updatePlay,
} from '../core/storage';
import { DEFAULT_PRIZES } from '../core/defaults';
import { probabilities, validatePrizes } from '../core/prizes';
import { computeStats } from '../core/stats';
import { downloadCsv } from '../core/csv';
import { safeGoogleReviewUrl } from '../core/lead';
import { clear, el, int, must, qs, qsa, setText } from '../ui/dom';
import type { AppConfig, PlayRecord, Prize, PrizeKind } from '../core/types';

/** Estado editable del panel. Se copia para no tocar la configuración guardada. */
let config: AppConfig = loadConfig();
let draftPrizes: Prize[] = config.prizes.map((prize) => ({ ...prize }));
let plays: readonly PlayRecord[] = loadPlays();
let searchTerm = '';

const PRIZE_KINDS: readonly { readonly id: PrizeKind; readonly label: string }[] = [
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'descuento', label: 'Descuento / beca' },
  { id: 'clase', label: 'Clase o taller' },
  { id: 'material', label: 'Material' },
  { id: 'digital', label: 'Digital' },
  { id: 'sorpresa', label: 'Sorpresa' },
];

let toastTimer = 0;
function toast(message: string): void {
  const node = qs('#toast');
  if (!node) return;
  setText(node, message);
  node.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => node.classList.remove('is-visible'), 2600);
}

function flag(selector: string, message: string): void {
  const node = qs(selector);
  if (!node) return;
  setText(node, message);
  window.setTimeout(() => setText(node, ''), 3000);
}

/* ------------------------------------------------------------------ *
 * Pestañas
 * ------------------------------------------------------------------ */

function setupTabs(): void {
  const tabs = qsa<HTMLButtonElement>('.admin__tab');
  const activate = (name: string): void => {
    for (const tab of tabs) {
      tab.setAttribute('aria-selected', String(tab.dataset.panel === name));
    }
    for (const panel of qsa('.panel')) {
      panel.hidden = panel.id !== `panel-${name}`;
    }
    if (name === 'stats') renderStats();
    if (name === 'plays') renderPlays();
  };
  for (const tab of tabs) {
    tab.addEventListener('click', () => activate(tab.dataset.panel ?? 'prizes'));
  }
  activate('prizes');
}

/* ------------------------------------------------------------------ *
 * Premios
 * ------------------------------------------------------------------ */

function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || `premio-${Date.now().toString(36)}`
  );
}

function updateDraft(prizeId: string, patch: Partial<Prize>): void {
  draftPrizes = draftPrizes.map((prize) =>
    prize.id === prizeId ? { ...prize, ...patch, id: prize.id } : prize,
  );
  renderProbabilities();
}

function renderProbabilities(): void {
  const percents = new Map(probabilities(draftPrizes).map((item) => [item.id, item.percent]));
  for (const cell of qsa<HTMLElement>('[data-prob-for]')) {
    const percent = percents.get(cell.dataset.probFor ?? '') ?? 0;
    setText(must('[data-prob-text]', cell), `${percent.toFixed(1)}%`);
    const fill = qs<HTMLElement>('[data-prob-fill]', cell);
    if (fill) fill.style.width = `${Math.min(100, percent)}%`;
  }
}

function prizeRow(prize: Prize): HTMLTableRowElement {
  const row = document.createElement('tr');

  const enabled = el('input', { attrs: { type: 'checkbox', 'aria-label': `Activar ${prize.label}` } });
  enabled.checked = prize.enabled;
  enabled.addEventListener('change', () => updateDraft(prize.id, { enabled: enabled.checked }));

  const icon = el('input', { attrs: { type: 'text', maxlength: '4', 'aria-label': 'Icono' } });
  icon.value = prize.icon;
  icon.style.maxWidth = '58px';
  icon.addEventListener('input', () => updateDraft(prize.id, { icon: icon.value }));

  const label = el('input', { attrs: { type: 'text', maxlength: '42', 'aria-label': 'Nombre' } });
  label.value = prize.label;
  label.addEventListener('input', () => updateDraft(prize.id, { label: label.value }));

  const kind = document.createElement('select');
  kind.setAttribute('aria-label', 'Categoría');
  for (const option of PRIZE_KINDS) {
    kind.appendChild(el('option', { text: option.label, attrs: { value: option.id } }));
  }
  kind.value = prize.kind;
  kind.addEventListener('change', () => updateDraft(prize.id, { kind: kind.value as PrizeKind }));

  const weight = el('input', {
    attrs: { type: 'number', min: '0', max: '1000', step: '1', 'aria-label': 'Peso' },
  });
  weight.value = String(prize.weight);
  weight.addEventListener('input', () => updateDraft(prize.id, { weight: Number(weight.value) }));

  const detail = document.createElement('textarea');
  detail.rows = 2;
  detail.value = prize.detail;
  detail.setAttribute('aria-label', 'Condiciones');
  detail.addEventListener('input', () => updateDraft(prize.id, { detail: detail.value }));

  const probCell = el('td', {
    className: 'prob-cell',
    attrs: { 'data-prob-for': prize.id },
    children: [
      el('span', { text: '0%', attrs: { 'data-prob-text': '' } }),
      el('div', {
        className: 'prob-bar',
        children: [el('span', { attrs: { 'data-prob-fill': '' } })],
      }),
    ],
  });

  const remove = el('button', {
    className: 'icon-btn',
    text: '🗑',
    attrs: { type: 'button', title: `Quitar ${prize.label}`, 'aria-label': `Quitar ${prize.label}` },
  });
  remove.addEventListener('click', () => {
    draftPrizes = draftPrizes.filter((item) => item.id !== prize.id);
    renderPrizeTable();
  });

  for (const cell of [
    el('td', { children: [enabled] }),
    el('td', { children: [icon] }),
    el('td', { children: [label] }),
    el('td', { children: [kind] }),
    el('td', { children: [weight] }),
    probCell,
    el('td', { children: [detail] }),
    el('td', { children: [remove] }),
  ]) {
    row.appendChild(cell);
  }
  return row;
}

function renderPrizeTable(): void {
  const body = qs('#prize-rows');
  if (!body) return;
  clear(body);
  for (const prize of draftPrizes) {
    body.appendChild(prizeRow(prize));
  }
  renderProbabilities();
  showPrizeIssues([]);
}

function showPrizeIssues(messages: readonly string[]): void {
  const box = qs('#prize-issues');
  if (!box) return;
  clear(box);
  box.hidden = messages.length === 0;
  for (const message of messages) {
    box.appendChild(el('div', { text: `• ${message}` }));
  }
}

function setupPrizeActions(): void {
  qs('#add-prize')?.addEventListener('click', () => {
    const id = slugify(`premio ${draftPrizes.length + 1}`);
    draftPrizes = [
      ...draftPrizes,
      {
        id: draftPrizes.some((prize) => prize.id === id) ? `${id}-${Date.now().toString(36)}` : id,
        label: 'Nuevo premio',
        icon: '🎁',
        weight: 10,
        kind: 'sorpresa',
        detail: 'Describe aquí cómo se canjea y su vigencia.',
        enabled: true,
      },
    ];
    renderPrizeTable();
  });

  qs('#reset-prizes')?.addEventListener('click', () => {
    draftPrizes = DEFAULT_PRIZES.map((prize) => ({ ...prize }));
    renderPrizeTable();
    toast('Premios sugeridos restaurados (aún sin guardar).');
  });

  qs('#save-prizes')?.addEventListener('click', () => {
    const issues = validatePrizes(draftPrizes);
    if (issues.length > 0) {
      showPrizeIssues(issues.map((issue) => issue.message));
      toast('Revisa los avisos antes de guardar.');
      return;
    }
    config = saveConfig({ ...config, prizes: draftPrizes.map((prize) => ({ ...prize })) });
    showPrizeIssues([]);
    flag('#prizes-saved', '✓ Guardado');
    toast('Premios guardados.');
  });
}

/* ------------------------------------------------------------------ *
 * Marca y reglas
 * ------------------------------------------------------------------ */

function value(selector: string): string {
  return qs<HTMLInputElement | HTMLTextAreaElement>(selector)?.value.trim() ?? '';
}

function setValue(selector: string, text: string): void {
  const node = qs<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (node) node.value = text;
}

function fillBrandForm(): void {
  setValue('#b-institute', config.brand.institute);
  setValue('#b-legal', config.brand.legalName);
  setValue('#b-site', config.brand.site);
  setValue('#b-city', config.brand.city);
  setValue('#b-phone', config.brand.phone);
  setValue('#b-email', config.brand.email);
  setValue('#b-hours', config.brand.hours);
  setValue('#b-review-url', config.brand.googleReviewUrl);
  setValue('#b-review-hint', config.brand.reviewHint);
  setValue('#b-wheel-url', config.brand.wheelPublicUrl);
}

function setupBrandForm(): void {
  qs('#save-brand')?.addEventListener('click', () => {
    const reviewUrl = value('#b-review-url');
    const safe = safeGoogleReviewUrl(reviewUrl);
    setText(
      qs('#review-url-error'),
      safe || reviewUrl === ''
        ? ''
        : 'Ese enlace no parece de Google. Usa g.page, maps.app.goo.gl o search.google.com por https.',
    );
    if (!safe && reviewUrl !== '') {
      toast('El enlace de reseñas no se guardó: revisa el dominio.');
      return;
    }

    config = saveConfig({
      ...config,
      brand: {
        ...config.brand,
        institute: value('#b-institute') || config.brand.institute,
        legalName: value('#b-legal'),
        site: value('#b-site'),
        city: value('#b-city'),
        phone: value('#b-phone'),
        email: value('#b-email'),
        hours: value('#b-hours'),
        googleReviewUrl: safe ?? config.brand.googleReviewUrl,
        reviewHint: value('#b-review-hint'),
        wheelPublicUrl: value('#b-wheel-url'),
      },
    });
    fillBrandForm();
    applyBrand();
    flag('#brand-saved', '✓ Guardado');
    toast('Datos del instituto guardados.');
  });
}

function fillRulesForm(): void {
  setValue('#r-cooldown', String(config.rules.cooldownHours));
  setValue('#r-validity', String(config.rules.prizeValidityDays));
  setValue('#r-duration', String(config.rules.spinDurationMs));
  const lead = qs<HTMLInputElement>('#r-require-lead');
  const consent = qs<HTMLInputElement>('#r-require-consent');
  if (lead) lead.checked = config.rules.requireLead;
  if (consent) consent.checked = config.rules.requireConsent;
}

function clampNumber(raw: string, min: number, max: number, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function setupRulesForm(): void {
  qs('#save-rules')?.addEventListener('click', () => {
    config = saveConfig({
      ...config,
      rules: {
        cooldownHours: clampNumber(value('#r-cooldown'), 0, 720, config.rules.cooldownHours),
        prizeValidityDays: clampNumber(value('#r-validity'), 1, 365, config.rules.prizeValidityDays),
        spinDurationMs: clampNumber(value('#r-duration'), 1200, 12000, config.rules.spinDurationMs),
        requireLead: qs<HTMLInputElement>('#r-require-lead')?.checked ?? true,
        requireConsent: qs<HTMLInputElement>('#r-require-consent')?.checked ?? true,
      },
    });
    fillRulesForm();
    flag('#rules-saved', '✓ Guardado');
    toast('Reglas guardadas.');
  });
}

/* ------------------------------------------------------------------ *
 * Estadísticas
 * ------------------------------------------------------------------ */

function kpi(value_: string, label: string): HTMLElement {
  return el('div', {
    className: 'kpi',
    children: [
      el('div', { className: 'kpi__value', text: value_ }),
      el('div', { className: 'kpi__label', text: label }),
    ],
  });
}

function renderBars(selector: string, rows: readonly { label: string; count: number }[]): void {
  const target = qs(selector);
  if (!target) return;
  clear(target);

  if (rows.length === 0) {
    target.appendChild(
      el('p', { className: 'empty-state', text: 'Todavía no hay datos. Empieza a girar 🎡' }),
    );
    return;
  }

  const max = Math.max(...rows.map((row) => row.count));
  for (const row of rows) {
    target.appendChild(
      el('div', {
        className: 'bar-row',
        children: [
          el('span', { text: row.label }),
          el('div', {
            className: 'bar-track',
            children: [
              el('div', {
                className: 'bar-fill',
                attrs: { style: `width:${max === 0 ? 0 : (row.count / max) * 100}%` },
              }),
            ],
          }),
          el('strong', { text: int(row.count) }),
        ],
      }),
    );
  }
}

function programName(programId: string): string {
  return config.programs.find((program) => program.id === programId)?.name ?? programId;
}

function renderStats(): void {
  plays = loadPlays();
  const stats = computeStats(plays, config.prizes);
  const container = qs('#kpis');
  if (container) {
    clear(container);
    for (const [value_, label] of [
      [int(stats.total), 'giros totales'],
      [int(stats.today), 'giros hoy'],
      [int(stats.last7Days), 'últimos 7 días'],
      [int(stats.leads), 'leads con contacto'],
      [int(stats.reviewsOpened), 'abrieron Google'],
      [`${stats.reviewRate}%`, 'tasa de reseña'],
      [stats.averageRating === null ? '—' : `${stats.averageRating}★`, 'valoración interna'],
      [int(stats.redeemed), 'premios entregados'],
    ] as const) {
      container.appendChild(kpi(value_, label));
    }
  }

  renderBars(
    '#bars-prizes',
    stats.byPrize.map((row) => ({ label: row.label, count: row.count })),
  );
  renderBars(
    '#bars-programs',
    stats.byProgram.map((row) => ({ label: programName(row.programId), count: row.count })),
  );
  renderBars(
    '#bars-days',
    stats.byDay.slice(-14).map((row) => ({ label: row.day, count: row.count })),
  );
}

/* ------------------------------------------------------------------ *
 * Jugadas
 * ------------------------------------------------------------------ */

function matchesSearch(play: PlayRecord): boolean {
  if (!searchTerm) return true;
  const haystack = `${play.name} ${play.contact} ${play.code} ${play.programId} ${play.prizeLabel} ${play.source}`;
  return haystack.toLowerCase().includes(searchTerm);
}

function playRow(play: PlayRecord): HTMLTableRowElement {
  const row = document.createElement('tr');
  const date = new Date(play.at);

  const redeemed = el('input', {
    attrs: { type: 'checkbox', 'aria-label': `Marcar entregado ${play.code}` },
  });
  redeemed.checked = play.redeemed;
  redeemed.addEventListener('change', () => {
    plays = updatePlay(play.id, { redeemed: redeemed.checked });
    toast(redeemed.checked ? 'Premio marcado como entregado.' : 'Premio marcado como pendiente.');
  });

  for (const cell of [
    el('td', { text: date.toLocaleString('es-MX', { hour12: false }) }),
    el('td', { text: play.name || '—' }),
    el('td', { text: play.contact || '—' }),
    el('td', { text: programName(play.programId) }),
    el('td', { text: play.prizeLabel }),
    el('td', { text: play.code }),
    el('td', { text: play.rating === null ? '—' : `${play.rating}★` }),
    el('td', {
      children: [
        el('span', {
          className: play.reviewOpened ? 'badge badge--ok' : 'badge badge--pending',
          text: play.reviewOpened ? 'sí' : 'no',
        }),
      ],
    }),
    el('td', { children: [redeemed] }),
  ]) {
    row.appendChild(cell);
  }
  return row;
}

function renderPlays(): void {
  plays = loadPlays();
  const body = qs('#play-rows');
  if (!body) return;
  clear(body);

  const filtered = [...plays].filter(matchesSearch).reverse();
  if (filtered.length === 0) {
    const row = document.createElement('tr');
    const cell = el('td', {
      className: 'empty-state',
      text: plays.length === 0 ? 'Aún no hay jugadas registradas.' : 'Ningún resultado para tu búsqueda.',
      attrs: { colspan: '9' },
    });
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }

  for (const play of filtered) {
    body.appendChild(playRow(play));
  }
}

function setupPlaysActions(): void {
  qs<HTMLInputElement>('#play-search')?.addEventListener('input', (event) => {
    searchTerm = (event.target as HTMLInputElement).value.trim().toLowerCase();
    renderPlays();
  });

  qs('#export-csv')?.addEventListener('click', () => {
    const current = loadPlays();
    if (current.length === 0) {
      toast('No hay jugadas que exportar todavía.');
      return;
    }
    downloadCsv(current);
    toast(`CSV con ${current.length} jugadas descargado.`);
  });

  qs('#clear-plays')?.addEventListener('click', () => {
    const total = loadPlays().length;
    if (total === 0) {
      toast('El histórico ya está vacío.');
      return;
    }
    const confirmed = window.confirm(
      `Vas a borrar ${total} jugadas de este navegador. Esta acción no se puede deshacer.\n\n` +
        '¿Ya exportaste el CSV?',
    );
    if (!confirmed) return;
    clearPlays();
    plays = [];
    renderPlays();
    renderStats();
    toast('Histórico borrado.');
  });
}

/* ------------------------------------------------------------------ *
 * Arranque
 * ------------------------------------------------------------------ */

function applyBrand(): void {
  for (const node of qsa('[data-institute]')) setText(node, config.brand.institute);
}

function boot(): void {
  applyBrand();
  setupTabs();
  renderPrizeTable();
  setupPrizeActions();
  fillBrandForm();
  setupBrandForm();
  fillRulesForm();
  setupRulesForm();
  setupPlaysActions();
}

boot();
