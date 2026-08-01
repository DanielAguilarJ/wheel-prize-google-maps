import type { Prize } from '../core/types';
import { PRIZE_COLORS, WHEEL_FALLBACK_COLORS } from '../core/defaults';
import {
  TAU,
  indexAtPointer,
  labelFontSize,
  rotationAt,
  segmentAngle,
  targetRotation,
  wrapLabel,
} from '../core/wheel-geometry';

export interface WheelOptions {
  readonly canvas: HTMLCanvasElement;
  readonly prizes: readonly Prize[];
  readonly spinDurationMs?: number;
  readonly turns?: number;
  /** Se llama al terminar el giro con el premio ganado. */
  readonly onFinish?: (prize: Prize, index: number) => void;
  /** Se llama al empezar el giro. */
  readonly onStart?: () => void;
  /** Sonido de tic al cambiar de segmento (opcional). */
  readonly onTick?: () => void;
}

/**
 * Ruleta en canvas 2D.
 * Se puede reutilizar en la landing (modo demo) y en la página del cliente.
 * El premio se decide antes de animar: la animación sólo lo muestra.
 */
export class Wheel {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private prizes: readonly Prize[];
  private rotation = -Math.PI / 2;
  private spinning = false;
  private animationId = 0;
  private lastTickIndex = -1;
  private readonly spinDurationMs: number;
  private readonly turns: number;
  private readonly onFinish?: (prize: Prize, index: number) => void;
  private readonly onStart?: () => void;
  private readonly onTick?: () => void;

  constructor(options: WheelOptions) {
    const context = options.canvas.getContext('2d');
    if (!context) {
      throw new Error('El navegador no soporta canvas 2D: la ruleta no puede dibujarse.');
    }
    this.canvas = options.canvas;
    this.ctx = context;
    this.prizes = options.prizes;
    this.spinDurationMs = options.spinDurationMs ?? 5200;
    this.turns = options.turns ?? 6;
    this.onFinish = options.onFinish;
    this.onStart = options.onStart;
    this.onTick = options.onTick;

    this.resize();
    window.addEventListener('resize', this.handleResize, { passive: true });
  }

  private resizeFrame = 0;

  /** Redimensionar reasigna el búfer del canvas: se agrupa en un solo frame. */
  private readonly handleResize = (): void => {
    if (this.resizeFrame !== 0) return;
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0;
      this.resize();
    });
  };

  /** Ajusta el canvas al tamaño CSS y a la densidad de pantalla. */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const cssSize = Math.max(220, Math.min(rect.width || 320, 620));
    // Se limita a 2x: por encima no se distingue y multiplica los píxeles a pintar.
    const dpr = Wheel.pixelRatio();
    this.canvas.width = Math.round(cssSize * dpr);
    this.canvas.height = Math.round(cssSize * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  private static pixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  setPrizes(prizes: readonly Prize[]): void {
    this.prizes = prizes;
    this.lastTickIndex = -1;
    this.draw();
  }

  get isSpinning(): boolean {
    return this.spinning;
  }

  /**
   * Gira hasta el premio indicado (ya sorteado por la lógica de negocio).
   * Devuelve una promesa que se resuelve al terminar la animación.
   */
  spinTo(prize: Prize, jitter = Math.random()): Promise<Prize> {
    const index = this.prizes.findIndex((item) => item.id === prize.id);
    if (index < 0) {
      return Promise.reject(new Error(`El premio ${prize.id} no está en la ruleta.`));
    }
    if (this.spinning) {
      return Promise.reject(new Error('La ruleta ya está girando.'));
    }

    this.spinning = true;
    this.onStart?.();

    const from = this.rotation;
    const to = targetRotation(index, this.prizes.length, from, this.turns, jitter);
    const start = performance.now();

    return new Promise<Prize>((resolve) => {
      const step = (now: number): void => {
        const elapsed = now - start;
        this.rotation = rotationAt(from, to, elapsed, this.spinDurationMs);
        this.emitTick();
        this.draw();

        if (elapsed < this.spinDurationMs) {
          this.animationId = requestAnimationFrame(step);
          return;
        }

        this.rotation = to;
        this.draw();
        this.spinning = false;
        this.onFinish?.(prize, index);
        resolve(prize);
      };
      this.animationId = requestAnimationFrame(step);
    });
  }

  /**
   * Giro lento y continuo para la demo de la landing.
   * Se detiene cuando la ruleta sale de la pantalla o la pestaña pasa a segundo
   * plano, y no arranca si el sistema pide reducir el movimiento: un canvas
   * repintándose 60 veces por segundo sin que nadie lo vea sólo gasta batería.
   */
  idle(speed = 0.0022): () => void {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (reduceMotion) return () => {};

    let stopped = false;
    let visible = true;
    let onScreen = true;
    let frame = 0;
    let last = performance.now();

    const step = (now: number): void => {
      if (stopped) return;
      if (!this.spinning) {
        this.rotation += (now - last) * speed;
        this.draw();
      }
      last = now;
      frame = requestAnimationFrame(step);
    };

    const sync = (): void => {
      const shouldRun = visible && onScreen && !stopped;
      if (shouldRun && frame === 0) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      } else if (!shouldRun && frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const onVisibility = (): void => {
      visible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (entries) => {
              onScreen = entries.some((entry) => entry.isIntersecting);
              sync();
            },
            { threshold: 0.05 },
          )
        : null;
    observer?.observe(this.canvas);

    sync();

    return () => {
      stopped = true;
      if (frame !== 0) cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    if (this.resizeFrame !== 0) cancelAnimationFrame(this.resizeFrame);
    window.removeEventListener('resize', this.handleResize);
  }

  private emitTick(): void {
    if (!this.onTick) return;
    const index = indexAtPointer(this.rotation, this.prizes.length);
    if (index !== this.lastTickIndex) {
      this.lastTickIndex = index;
      this.onTick();
    }
  }

  private colorFor(prize: Prize, index: number): string {
    return (
      PRIZE_COLORS[prize.kind] ??
      WHEEL_FALLBACK_COLORS[index % WHEEL_FALLBACK_COLORS.length] ??
      '#6D28D9'
    );
  }

  draw(): void {
    const { ctx } = this;
    const dpr = Wheel.pixelRatio();
    const size = this.canvas.width / dpr;
    const center = size / 2;
    const radius = center * 0.92;
    const count = this.prizes.length;

    ctx.clearRect(0, 0, size, size);
    if (count === 0) {
      this.drawEmpty(center, radius);
      return;
    }

    const seg = segmentAngle(count);

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(this.rotation);

    for (let i = 0; i < count; i += 1) {
      const prize = this.prizes[i];
      if (!prize) continue;
      const start = i * seg;
      const end = start + seg;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = this.colorFor(prize, i);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();

      this.drawSegmentLabel(prize, start + seg / 2, radius, count);
    }

    ctx.restore();

    this.drawRim(center, radius);
    this.drawHub(center, radius);
    this.drawPointer(center, radius);
  }

  private drawSegmentLabel(prize: Prize, midAngle: number, radius: number, count: number): void {
    const { ctx } = this;
    const fontSize = labelFontSize(radius, count);
    const maxChars = count > 8 ? 12 : 16;
    const lines = wrapLabel(prize.label, maxChars, 3);

    ctx.save();
    ctx.rotate(midAngle);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 3;

    ctx.font = `${Math.round(fontSize * 1.5)}px system-ui, "Apple Color Emoji", sans-serif`;
    ctx.fillText(prize.icon, radius * 0.32, 0);

    ctx.font = `700 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
    const lineHeight = fontSize * 1.12;
    const offsetY = -((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      ctx.fillText(line, radius * 0.94, offsetY + index * lineHeight);
    });

    ctx.restore();
  }

  private drawRim(center: number, radius: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 4, 0, TAU);
    ctx.lineWidth = 8;
    const gradient = ctx.createLinearGradient(0, 0, center * 2, center * 2);
    gradient.addColorStop(0, '#F59E0B');
    gradient.addColorStop(0.5, '#FDE68A');
    gradient.addColorStop(1, '#D97706');
    ctx.strokeStyle = gradient;
    ctx.stroke();

    // Bombillas decorativas.
    const bulbs = 16;
    for (let i = 0; i < bulbs; i += 1) {
      const angle = (i / bulbs) * TAU + this.rotation * 0.4;
      const x = center + Math.cos(angle) * (radius + 4);
      const y = center + Math.sin(angle) * (radius + 4);
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, TAU);
      ctx.fillStyle = i % 2 === 0 ? '#FFFBEB' : '#FCD34D';
      ctx.fill();
    }
    ctx.restore();
  }

  private drawHub(center: number, radius: number): void {
    const { ctx } = this;
    const hubRadius = Math.max(26, radius * 0.16);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, hubRadius, 0, TAU);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(15,23,42,0.35)';
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4C1D95';
    ctx.font = `800 ${Math.round(hubRadius * 0.52)}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('WB', center, center + 1);
    ctx.restore();
  }

  private drawPointer(center: number, radius: number): void {
    const { ctx } = this;
    const tipY = center - radius - 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(center, tipY + 22);
    ctx.lineTo(center - 13, tipY - 6);
    ctx.lineTo(center + 13, tipY - 6);
    ctx.closePath();
    ctx.fillStyle = '#DC2626';
    ctx.shadowColor = 'rgba(15,23,42,0.4)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  private drawEmpty(center: number, radius: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, TAU);
    ctx.fillStyle = '#E5E7EB';
    ctx.fill();
    ctx.fillStyle = '#6B7280';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Configura tus premios', center, center);
    ctx.restore();
  }
}
