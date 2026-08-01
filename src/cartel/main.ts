import '../styles/base.css';
import '../styles/cartel.css';

import { loadConfig } from '../core/storage';
import { buildQrUrl } from '../core/qr-url';
import { clear, el, qs, qsa, setText } from '../ui/dom';

const config = loadConfig();

const THEMES: Readonly<Record<string, readonly [string, string]>> = {
  violeta: ['#4C1D95', '#6D28D9'],
  cian: ['#0E7490', '#155E75'],
  magenta: ['#DB2777', '#9D174D'],
  ambar: ['#B45309', '#7C2D12'],
};

let currentTheme = 'violeta';

/**
 * La librería de QR pesa ~24 kB y sólo hace falta cuando ya se pintó el cartel.
 * Se carga en un chunk aparte, una sola vez, para que la página aparezca antes.
 */
type QrModule = typeof import('qrcode');
let qrModulePromise: Promise<QrModule> | null = null;

function loadQrLibrary(): Promise<QrModule> {
  qrModulePromise ??= import('qrcode');
  return qrModulePromise;
}

let toastTimer = 0;
function toast(message: string): void {
  const node = qs('#toast');
  if (!node) return;
  setText(node, message);
  node.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => node.classList.remove('is-visible'), 2400);
}

function inputValue(selector: string): string {
  return qs<HTMLInputElement>(selector)?.value.trim() ?? '';
}

/**
 * URL final del QR: base + parámetros de origen y programa.
 * La lógica vive en src/core/qr-url.ts para poder probarla sin navegador.
 */

function fillProgramSelect(): void {
  const select = qs<HTMLSelectElement>('#f-program');
  if (!select) return;
  for (const program of config.programs.filter((item) => item.id !== 'otro')) {
    select.appendChild(
      el('option', { text: `${program.icon} ${program.name}`, attrs: { value: program.id } }),
    );
  }
}

function renderPrizes(): void {
  const target = qs('#p-prizes');
  if (!target) return;
  clear(target);
  const show = qs<HTMLInputElement>('#f-show-prizes')?.checked ?? true;
  if (!show) return;

  for (const prize of config.prizes.filter((item) => item.enabled).slice(0, 6)) {
    target.appendChild(
      el('span', { className: 'poster__prize', text: `${prize.icon} ${prize.label}` }),
    );
  }
}

async function renderQr(): Promise<void> {
  const canvas = qs<HTMLCanvasElement>('#p-qr');
  if (!canvas) return;

  const url = buildQrUrl(inputValue('#f-url'), inputValue('#f-source'), inputValue('#f-program'));

  try {
    const QRCode = await loadQrLibrary();
    await QRCode.toCanvas(canvas, url || 'https://ultravelozmente.com', {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });
    setText(qs('#qr-status'), `QR apuntando a: ${url}`);
  } catch (error) {
    setText(
      qs('#qr-status'),
      `No se pudo generar el QR: ${error instanceof Error ? error.message : 'URL inválida'}`,
    );
  }
}

function renderPoster(): void {
  const poster = qs<HTMLElement>('#poster');
  const [from, to] = THEMES[currentTheme] ?? THEMES.violeta!;
  if (poster) {
    poster.style.setProperty('--poster-from', from);
    poster.style.setProperty('--poster-to', to);
  }

  setText(qs('#p-brand'), config.brand.institute.toUpperCase());
  setText(qs('#p-icon'), inputValue('#f-icon') || '🎡');
  setText(qs('#p-title'), inputValue('#f-title') || 'Gira y gana');
  setText(qs('#p-subtitle'), inputValue('#f-subtitle'));
  setText(qs('#p-qr-label'), inputValue('#f-qr-label') || 'Escanea con tu celular');
  setText(
    qs('#p-foot'),
    `${config.brand.site} · ${config.brand.city} · ${config.brand.hours}. ` +
      'El premio se entrega por participar en la ruleta; dejar una reseña es opcional y no lo condiciona. ' +
      'Un giro por persona. Promoción sujeta a disponibilidad.',
  );

  renderPrizes();
  void renderQr();
}

function setupThemeButtons(): void {
  const chips = qsa<HTMLButtonElement>('.theme-chip');
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      currentTheme = chip.dataset.theme ?? 'violeta';
      for (const item of chips) {
        item.setAttribute('aria-pressed', String(item.dataset.theme === currentTheme));
      }
      renderPoster();
    });
  }
}

function setupForm(): void {
  const form = qs<HTMLFormElement>('#poster-form');
  if (!form) return;

  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('input', renderPoster);
  form.addEventListener('change', renderPoster);

  qs('#print-poster')?.addEventListener('click', () => window.print());

  qs('#download-qr')?.addEventListener('click', async () => {
    const url = buildQrUrl(inputValue('#f-url'), inputValue('#f-source'), inputValue('#f-program'));
    try {
      const QRCode = await loadQrLibrary();
      const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 2 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'ultragiro-qr.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast('QR descargado en alta resolución.');
    } catch {
      toast('Revisa la URL: no se pudo generar el PNG.');
    }
  });
}

function boot(): void {
  const urlField = qs<HTMLInputElement>('#f-url');
  if (urlField) urlField.value = config.brand.wheelPublicUrl;
  fillProgramSelect();
  setupThemeButtons();
  setupForm();
  renderPoster();
}

boot();
