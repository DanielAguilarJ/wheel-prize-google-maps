import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Pruebas de humo del cableado de cada página.
 * Cargan el HTML real y ejecutan su módulo: si falta un id, cambia un selector
 * o un arranque revienta, estas pruebas fallan antes de que llegue al cartel.
 *
 * jsdom no implementa canvas: las páginas deben degradar sin lanzar excepciones.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadPage(file: string): void {
  const html = readFileSync(resolve(root, file), 'utf8');
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  document.body.innerHTML = bodyMatch?.[1] ?? '';
  const classMatch = /<body[^>]*class="([^"]*)"/i.exec(html);
  document.body.className = classMatch?.[1] ?? '';
}

beforeEach(() => {
  vi.resetModules();
  window.localStorage.clear();
  document.body.innerHTML = '';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('landing (index.html)', () => {
  it('arranca y rellena programas, marquesina, testimonios y calculadora', async () => {
    loadPage('index.html');
    await import('./landing/main');

    expect(document.querySelectorAll('#programs-grid .program').length).toBeGreaterThan(3);
    expect(document.querySelectorAll('#marquee-track span').length).toBeGreaterThan(6);
    expect(document.querySelectorAll('#reviews-grid .review').length).toBeGreaterThan(3);
    expect(document.querySelector('#out-revenue')?.textContent).toMatch(/\$/);
    expect(document.querySelector('#visitors-out')?.textContent).toBe('300');
  });

  it('la cuenta regresiva muestra un tiempo con formato', async () => {
    loadPage('index.html');
    await import('./landing/main');
    expect(document.querySelector('[data-countdown="hours"]')?.textContent).toMatch(/^\d{2}$/);
  });

  it('las pestañas cambian el listado de programas', async () => {
    loadPage('index.html');
    await import('./landing/main');

    const adultTab = document.querySelector<HTMLButtonElement>('[data-audience="jovenes-adultos"]');
    adultTab?.click();
    expect(adultTab?.getAttribute('aria-selected')).toBe('true');
    const names = Array.from(document.querySelectorAll('#programs-grid .program__name')).map(
      (node) => node.textContent,
    );
    expect(names).toContain('Fotolectura');
    expect(names).not.toContain('MatheKids');
  });

  it('el enlace de WhatsApp queda armado', async () => {
    loadPage('index.html');
    await import('./landing/main');
    expect(document.querySelector<HTMLAnchorElement>('#wa-cta')?.href).toContain('wa.me/');
  });
});

describe('ruleta (ruleta.html)', () => {
  it('muestra la pantalla de captura con los programas cargados', async () => {
    loadPage('ruleta.html');
    await import('./wheel/page');

    expect(document.querySelector<HTMLElement>('#screen-lead')?.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>('#screen-result')?.hidden).toBe(true);
    expect(document.querySelectorAll('#lead-program optgroup').length).toBe(2);
    expect(document.querySelectorAll('#lead-program option').length).toBeGreaterThan(10);
  });

  it('no avanza al giro si el formulario está vacío y muestra los errores', async () => {
    loadPage('ruleta.html');
    await import('./wheel/page');

    document.querySelector<HTMLFormElement>('#lead-form')?.dispatchEvent(
      new Event('submit', { cancelable: true, bubbles: true }),
    );

    expect(document.querySelector('[data-error="name"]')?.textContent).not.toBe('');
    expect(document.querySelector('[data-error="consent"]')?.textContent).not.toBe('');
    expect(document.querySelector<HTMLElement>('#screen-wheel')?.hidden).toBe(true);
  });

  it('avanza a la ruleta con datos válidos', async () => {
    loadPage('ruleta.html');
    await import('./wheel/page');

    document.querySelector<HTMLInputElement>('#lead-name')!.value = 'Ana Pérez';
    document.querySelector<HTMLInputElement>('#lead-contact')!.value = '5512345678';
    document.querySelector<HTMLSelectElement>('#lead-program')!.value = 'mathekids';
    document.querySelector<HTMLInputElement>('#lead-consent')!.checked = true;

    document.querySelector<HTMLFormElement>('#lead-form')?.dispatchEvent(
      new Event('submit', { cancelable: true, bubbles: true }),
    );

    expect(document.querySelector<HTMLElement>('#screen-wheel')?.hidden).toBe(false);
    expect(document.querySelector('#player-name')?.textContent).toBe('Ana');
  });

  it('el bloque de reseña es visible para todos y no depende de la calificación', async () => {
    loadPage('ruleta.html');
    await import('./wheel/page');

    // No está oculto en el HTML: se ofrece a cualquiera que gire.
    expect(document.querySelector<HTMLElement>('#review-block')?.hidden).toBe(false);
    // El canal privado empieza oculto y sólo aparece con nota baja.
    expect(document.querySelector<HTMLElement>('#feedback-block')?.hidden).toBe(true);
    // No existe una segunda ruta "alternativa": hay un único enlace público.
    expect(document.querySelector('#review-link-alt')).toBeNull();
  });

  it('el enlace de reseña usa el enlace corto que abre la app de Maps', async () => {
    loadPage('ruleta.html');
    await import('./wheel/page');
    const { DEFAULT_CONFIG } = await import('./core/defaults');

    const url = new URL(DEFAULT_CONFIG.brand.googleReviewUrl);
    expect(url.hostname).toBe('g.page');
    expect(url.pathname).toMatch(/\/review$/);
    // Nunca se apunta a /maps/place, que sí muestra las reseñas de otras personas.
    expect(DEFAULT_CONFIG.brand.googleReviewUrl).not.toContain('/maps/place');
  });

  it('el botón de reseña queda apuntando al enlace configurado', async () => {
    loadPage('ruleta.html');
    await import('./wheel/page');
    const { DEFAULT_CONFIG } = await import('./core/defaults');

    // El href se asigna al renderizar el resultado; aquí se comprueba que el
    // enlace configurado pasa el filtro de dominios permitidos.
    const { safeGoogleReviewUrl } = await import('./core/lead');
    expect(safeGoogleReviewUrl(DEFAULT_CONFIG.brand.googleReviewUrl)).toContain('g.page');
  });
});

describe('panel (admin.html)', () => {
  it('dibuja la tabla de premios con probabilidades que suman 100%', async () => {
    loadPage('admin.html');
    await import('./admin/main');

    const rows = document.querySelectorAll('#prize-rows tr');
    expect(rows.length).toBe(8);

    const percents = Array.from(document.querySelectorAll('[data-prob-text]')).map((node) =>
      Number.parseFloat(node.textContent ?? '0'),
    );
    const sum = percents.reduce((acc, value) => acc + value, 0);
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThan(101);
  });

  it('añadir y quitar premios actualiza la tabla', async () => {
    loadPage('admin.html');
    await import('./admin/main');

    document.querySelector<HTMLButtonElement>('#add-prize')?.click();
    expect(document.querySelectorAll('#prize-rows tr').length).toBe(9);

    document.querySelector<HTMLButtonElement>('#prize-rows tr .icon-btn')?.click();
    expect(document.querySelectorAll('#prize-rows tr').length).toBe(8);
  });

  it('rechaza un enlace de reseñas que no sea de Google', async () => {
    loadPage('admin.html');
    await import('./admin/main');

    document.querySelector<HTMLInputElement>('#b-review-url')!.value = 'https://sitio-falso.com/x';
    document.querySelector<HTMLButtonElement>('#save-brand')?.click();

    expect(document.querySelector('#review-url-error')?.textContent).toContain('no parece de Google');
  });

  it('la pestaña de jugadas muestra el estado vacío', async () => {
    loadPage('admin.html');
    await import('./admin/main');

    document.querySelector<HTMLButtonElement>('[data-panel="plays"]')?.click();
    expect(document.querySelector('#play-rows')?.textContent).toContain('Aún no hay jugadas');
  });

  it('la pestaña de estadísticas muestra los KPI en cero', async () => {
    loadPage('admin.html');
    await import('./admin/main');

    document.querySelector<HTMLButtonElement>('[data-panel="stats"]')?.click();
    expect(document.querySelectorAll('#kpis .kpi').length).toBe(8);
    expect(document.querySelector('#kpis .kpi__value')?.textContent).toBe('0');
  });
});

describe('cartel (cartel.html)', () => {
  it('rellena el cartel con la marca, premios y programas', async () => {
    loadPage('cartel.html');
    await import('./cartel/main');

    expect(document.querySelector('#p-brand')?.textContent).toBe('WORLDBRAIN MÉXICO');
    expect(document.querySelector('#p-title')?.textContent).toBe('Gira y gana');
    expect(document.querySelectorAll('#p-prizes .poster__prize').length).toBe(6);
    expect(document.querySelectorAll('#f-program option').length).toBeGreaterThan(10);
    expect(document.querySelector<HTMLInputElement>('#f-url')?.value).toContain('ultravelozmente');
  });

  it('cambia el estilo del cartel al elegir otro tema', async () => {
    loadPage('cartel.html');
    await import('./cartel/main');

    const chip = document.querySelector<HTMLButtonElement>('[data-theme="magenta"]');
    chip?.click();
    expect(chip?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector<HTMLElement>('#poster')?.style.getPropertyValue('--poster-from')).toBe(
      '#DB2777',
    );
  });
});
