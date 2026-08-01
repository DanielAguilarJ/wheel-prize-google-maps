/** Utilidades mínimas de DOM, con tipos estrictos y sin dependencias. */

export function qs<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}

/** Igual que qs, pero falla rápido si el elemento no existe (error de plantilla). */
export function must<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const found = root.querySelector<T>(selector);
  if (!found) {
    throw new Error(`Elemento no encontrado en el HTML: ${selector}`);
  }
  return found;
}

export function qsa<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): readonly T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function setText(target: Element | null, text: string): void {
  if (target) target.textContent = text;
}

export interface ElementOptions {
  readonly className?: string;
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string>>;
  readonly children?: readonly Node[];
}

/**
 * Crea un elemento asignando texto con textContent (nunca innerHTML),
 * para que ningún dato capturado pueda inyectar HTML.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    node.setAttribute(name, value);
  }
  for (const child of options.children ?? []) {
    node.appendChild(child);
  }
  return node;
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Desplaza hasta el elemento sólo si el entorno lo soporta (jsdom no lo implementa). */
export function scrollIntoViewSafe(node: Element | null | undefined): void {
  if (node && typeof node.scrollIntoView === 'function') {
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/** Formatea moneda mexicana sin decimales. */
export function mxn(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

export function int(value: number): string {
  return new Intl.NumberFormat('es-MX').format(Math.round(value));
}

/** Lee un parámetro de la URL actual, saneado. */
export function urlParam(name: string, maxLength = 40): string {
  const raw = new URLSearchParams(window.location.search).get(name) ?? '';
  return raw.replace(/[^\w\s.@+-]/g, '').slice(0, maxLength);
}
