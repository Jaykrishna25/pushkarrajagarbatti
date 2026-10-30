/**
 * Incense smoke, drawn procedurally on a 2D canvas.
 *
 * Three ingredients, all cheap:
 *  - strands: a few thin ribbons rising from the ember. Each is a polyline
 *    whose sideways drift is a sum of travelling sine waves whose amplitude
 *    grows with height — laminar at the tip, turbulent as it climbs, which
 *    is how real incense smoke behaves. Drawn in short segments so width
 *    can grow and alpha fade along the length.
 *  - wisps: soft sprites shed from the strands that billow and fade, giving
 *    the smoke volume without blur filters.
 *  - motes: tiny warm specks drifting in the light.
 *
 * No React here. Owners call `draw()` from the page's single rAF loop.
 */

export type SmokeParams = {
  /** Ember position in CSS pixels, relative to the canvas. null = no strands. */
  source: {x: number; y: number} | null;
  /** 0–1 overall strength. */
  intensity: number;
  /** How high the smoke climbs, as a fraction of the distance to the canvas top. */
  reach?: number;
  /** Sideways lean at the top, in CSS px. */
  lean?: number;
  /** 0–1 visibility of the drifting motes. */
  motes?: number;
  /** Draw a glow at the source (default true). */
  ember?: boolean;
  /** Freeze motion (reduced motion): draw a still frame. */
  still?: boolean;
};

type Strand = {phase: number; phase2: number; speed: number; amp: number; offset: number; width: number};
type Wisp = {x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; a: number};
type Mote = {x: number; y: number; r: number; s: number; tw: number; a: number};

const SMOKE_RGB = '236,228,214';

export class Smoke {
  private ctx: CanvasRenderingContext2D;
  private strands: Strand[];
  private wisps: Wisp[] = [];
  private motes: Mote[];
  private sprite: HTMLCanvasElement;
  private t = 0;
  private last = 0;
  private seed: number;
  private w = 1;
  private h = 1;
  private ro: ResizeObserver;
  private maxWisps: number;
  private strandPhase = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    opts: {strands?: number; motes?: number; wisps?: number; seed?: number} = {},
  ) {
    this.ctx = canvas.getContext('2d', {alpha: true})!;
    this.seed = opts.seed ?? 7;
    const small = window.matchMedia('(max-width: 767px)').matches;
    const nStrands = opts.strands ?? (small ? 3 : 4);
    this.maxWisps = Math.round((opts.wisps ?? 70) * (small ? 0.5 : 1));
    const nMotes = Math.round((opts.motes ?? 70) * (small ? 0.45 : 1));

    this.strands = Array.from({length: nStrands}, (_, i) => ({
      phase: this.rand() * Math.PI * 2,
      phase2: this.rand() * Math.PI * 2,
      speed: 0.55 + this.rand() * 0.5,
      amp: 0.7 + this.rand() * 0.6,
      offset: (i - (nStrands - 1) / 2) * 1.6,
      width: i === 0 ? 1.15 : 0.7 + this.rand() * 0.4,
    }));
    this.motes = Array.from({length: nMotes}, () => ({
      x: this.rand(),
      y: this.rand(),
      r: 0.5 + this.rand() * 1.4,
      s: 0.25 + this.rand() * 0.8,
      tw: this.rand() * Math.PI * 2,
      a: 0.25 + this.rand() * 0.6,
    }));

    // One soft round sprite reused for every wisp.
    this.sprite = document.createElement('canvas');
    this.sprite.width = this.sprite.height = 64;
    const sctx = this.sprite.getContext('2d')!;
    const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${SMOKE_RGB},1)`);
    g.addColorStop(0.45, `rgba(${SMOKE_RGB},0.35)`);
    g.addColorStop(1, `rgba(${SMOKE_RGB},0)`);
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 64, 64);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  private rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.w = Math.max(1, this.canvas.clientWidth);
    this.h = Math.max(1, this.canvas.clientHeight);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  destroy() {
    this.ro.disconnect();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  draw(time: number, p: SmokeParams) {
    const dt = this.last ? Math.min(0.05, (time - this.last) / 1000) : 1 / 60;
    this.last = time;
    if (!p.still) this.t += dt;
    const {ctx, w, h} = this;
    ctx.clearRect(0, 0, w, h);
    const I = Math.max(0, Math.min(1, p.intensity));
    if (I <= 0.002 && (p.motes ?? 0) <= 0.002) return;

    ctx.globalCompositeOperation = 'lighter';
    const scale = Math.min(1.25, Math.max(0.6, Math.min(w, h * 1.2) / 900));

    if (p.source && I > 0.002) {
      const {x: sx, y: sy} = p.source;
      const reach = (p.reach ?? 0.9) * Math.max(80, sy);
      const lean = p.lean ?? 40 * scale;
      const t = this.t;
      const SEG = 60;

      const CH = 12;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';
      for (const st of this.strands) {
        // Laminar near the ember (all strands share one thin column), then
        // the column breaks up and each strand finds its own path.
        const xs: number[] = [];
        const ys: number[] = [];
        for (let k = 0; k <= SEG; k++) {
          const s = k / SEG;
          const breakup = Math.pow(Math.max(0, (s - 0.06) / 0.94), 1.35);
          const drift =
            Math.sin(s * 6.5 - t * 1.2 * st.speed + st.phase) * 0.62 +
            Math.sin(s * 13.0 - t * 1.9 * st.speed + st.phase2) * 0.3 +
            Math.sin(s * 27.0 - t * 2.9 + st.phase) * 0.12 * s;
          xs.push(sx + (drift * 64 * st.amp + st.offset * 18) * breakup * scale + Math.sin(s * 3 - t * 0.8) * 1.5 * scale + lean * s * s);
          ys.push(sy - s * reach);
        }
        for (let c = 0; c < CH; c++) {
          const a0 = Math.round((c * SEG) / CH);
          const a1 = Math.round(((c + 1) * SEG) / CH);
          const s = (a0 + a1) / 2 / SEG;
          const grow = Math.pow(s, 1.5);
          const a = I * Math.min(1, s * 10 + 0.25) * Math.pow(1 - s, 1.25);
          if (a < 0.004) continue;
          ctx.beginPath();
          ctx.moveTo(xs[a0]!, ys[a0]!);
          for (let k = a0 + 1; k <= a1; k++) ctx.lineTo(xs[k]!, ys[k]!);
          ctx.strokeStyle = `rgba(${SMOKE_RGB},${(a * 0.07).toFixed(3)})`;
          ctx.lineWidth = (4 + grow * 30) * scale * st.width;
          ctx.stroke();
          ctx.strokeStyle = `rgba(${SMOKE_RGB},${(a * 0.13).toFixed(3)})`;
          ctx.lineWidth = (1.6 + grow * 12) * scale * st.width;
          ctx.stroke();
          ctx.strokeStyle = `rgba(${SMOKE_RGB},${(a * 0.42).toFixed(3)})`;
          ctx.lineWidth = (0.7 + grow * 2.6) * scale * st.width;
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'lighter';

      // The ember itself, so it reads even while the scene is still dark.
      if (p.ember !== false) {
        const er = 16 * scale;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, er);
        g.addColorStop(0, `rgba(255,236,190,${(0.9 * I).toFixed(3)})`);
        g.addColorStop(0.25, `rgba(255,150,60,${(0.55 * I).toFixed(3)})`);
        g.addColorStop(1, 'rgba(200,60,20,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sx - er, sy - er, er * 2, er * 2);
      }

      // Shed wisps from the upper strands.
      if (!p.still) {
        this.strandPhase += dt * 9 * I;
        while (this.strandPhase > 1 && this.wisps.length < this.maxWisps) {
          this.strandPhase -= 1;
          const s = 0.25 + this.rand() * 0.55;
          this.wisps.push({
            x: sx + (this.rand() - 0.5) * 60 * s * scale + lean * s * s,
            y: sy - s * reach,
            vx: (this.rand() - 0.5) * 14 * scale,
            vy: -(10 + this.rand() * 18) * scale,
            r: (10 + this.rand() * 18) * scale,
            life: 0,
            max: 3 + this.rand() * 3,
            a: 0.05 + this.rand() * 0.06,
          });
        }
        if (this.strandPhase > 1) this.strandPhase = 1;
      }
    }

    // Wisps billow and fade.
    for (let i = this.wisps.length - 1; i >= 0; i--) {
      const wsp = this.wisps[i]!;
      if (!p.still) {
        wsp.life += dt;
        wsp.x += (wsp.vx + Math.sin(this.t * 0.7 + i) * 6) * dt;
        wsp.y += wsp.vy * dt;
        wsp.r += 9 * dt;
      }
      const k = wsp.life / wsp.max;
      if (k >= 1) {
        this.wisps.splice(i, 1);
        continue;
      }
      const a = wsp.a * I * Math.sin(Math.PI * k);
      if (a < 0.003) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(this.sprite, wsp.x - wsp.r, wsp.y - wsp.r, wsp.r * 2, wsp.r * 2);
    }
    ctx.globalAlpha = 1;

    // Motes in the light.
    const M = p.motes ?? 0;
    if (M > 0.002) {
      ctx.fillStyle = 'rgb(242,206,140)';
      for (const m of this.motes) {
        if (!p.still) {
          m.y -= 0.006 * m.s * dt;
          m.x += Math.sin(this.t * 0.3 + m.tw) * 0.0006;
          if (m.y < -0.02) {
            m.y = 1.02;
            m.x = this.rand();
          }
        }
        const tw = 0.6 + 0.4 * Math.sin(this.t * 1.4 * m.s + m.tw);
        ctx.globalAlpha = m.a * tw * M;
        ctx.beginPath();
        ctx.arc(m.x * w, m.y * h, m.r * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
