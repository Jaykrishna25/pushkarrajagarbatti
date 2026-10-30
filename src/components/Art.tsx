import {forwardRef, useId} from 'react';
import {brand} from '../data/brand';
import {moods, type Mood, type Product} from '../data/products';

/**
 * Drawn artwork. Everything here is original vector art standing in for
 * photography that hasn't been supplied yet. The pack in particular is a
 * CONCEPT MOCKUP — it is labelled as such and is replaced automatically by
 * real product photos as soon as a product has `images`.
 */

/* ------------------------------------------------------------------ */
/* Concept pack                                                        */
/* ------------------------------------------------------------------ */

export function PackMockup({mood, className = '', label = true}: {mood: Mood; className?: string; label?: boolean}) {
  const id = useId().replace(/:/g, '');
  const m = moods[mood];
  return (
    <svg viewBox="0 0 300 470" className={className} role="img" aria-label={`Concept packaging mockup, ${m.label} fragrance — not the final Pushkar Raj pack`}>
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={m.packDeep} />
          <stop offset="0.35" stopColor={m.pack} />
          <stop offset="0.7" stopColor={m.pack} />
          <stop offset="1" stopColor={m.packDeep} />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={m.packDeep} />
          <stop offset="1" stopColor="#0d0907" />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1d9a0" />
          <stop offset="0.45" stopColor="#c7a15a" />
          <stop offset="1" stopColor="#8a6a2f" />
        </linearGradient>
        <radialGradient id={`${id}l`} cx="0.3" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </radialGradient>
        <radialGradient id={`${id}w`} cx="0.5" cy="0.75" r="0.7">
          <stop offset="0" stopColor={m.accent} stopOpacity="0.55" />
          <stop offset="1" stopColor={m.packDeep} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Contact shadow */}
      <ellipse cx="150" cy="458" rx="128" ry="9" fill="#000" opacity="0.45" />

      {/* Side face */}
      <path d="M232 22 L270 40 L270 452 L232 446 Z" fill={`url(#${id}s)`} />
      <path d="M232 22 L270 40 L270 46 L232 28 Z" fill={`url(#${id}g)`} opacity="0.7" />

      {/* Top face */}
      <path d="M30 22 L232 22 L270 40 L68 40 Z" fill={m.packDeep} />
      <path d="M30 22 L232 22 L270 40 L68 40 Z" fill="#fff" opacity="0.06" />

      {/* Front face */}
      <rect x="30" y="22" width="202" height="424" fill={`url(#${id}f)`} />
      <rect x="30" y="22" width="202" height="424" fill={`url(#${id}l)`} />

      {/* Gold frame */}
      <rect x="42" y="34" width="178" height="400" fill="none" stroke={`url(#${id}g)`} strokeWidth="2" />
      <rect x="48" y="40" width="166" height="388" fill="none" stroke={`url(#${id}g)`} strokeWidth="0.6" opacity="0.8" />

      {/* Arch window */}
      <g transform="translate(131 0)">
        <path d={archPath(0, 196, 54, 7, 252)} fill={`url(#${id}w)`} stroke={`url(#${id}g)`} strokeWidth="1.4" />
        <MoodGlyph mood={mood} />
      </g>

      {/* Wordmark */}
      <g fill={`url(#${id}g)`} textAnchor="middle" fontFamily="Cormorant Garamond, Georgia, serif">
        <text x="131" y="292" fontSize="31" fontWeight="600" letterSpacing="2">PUSHKAR</text>
        <text x="131" y="324" fontSize="31" fontWeight="600" letterSpacing="2">RAJ</text>
      </g>
      <line x1="86" y1="340" x2="176" y2="340" stroke={`url(#${id}g)`} strokeWidth="0.8" />
      <text x="131" y="358" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" letterSpacing="5" fill={m.accent}>
        AGARBATTI
      </text>
      <text x="131" y="396" textAnchor="middle" fontFamily="Cormorant Garamond, Georgia, serif" fontStyle="italic" fontSize="17" fill={m.accent} opacity="0.9">
        {m.label}
      </text>
      {label && (
        <text x="131" y="424" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="7" letterSpacing="2.5" fill={m.accent} opacity="0.55">
          CONCEPT MOCKUP
        </text>
      )}

      {/* Edge highlight */}
      <line x1="232" y1="22" x2="232" y2="446" stroke="#fff" strokeOpacity="0.18" />
    </svg>
  );
}

/** A small emblem per mood, centred at (0, 190) inside the pack's arch. */
function MoodGlyph({mood}: {mood: Mood}) {
  const c = moods[mood].accent;
  switch (mood) {
    case 'floral':
      return (
        <g transform="translate(0 186)" fill="none" stroke={c} strokeWidth="1.2">
          {Array.from({length: 8}, (_, i) => (
            <ellipse key={i} rx="7" ry="20" transform={`rotate(${i * 45}) translate(0 -14)`} />
          ))}
          <circle r="5" fill={c} />
        </g>
      );
    case 'woody':
      return (
        <g transform="translate(0 186)" fill="none" stroke={c} strokeWidth="1.1">
          {[8, 15, 22, 29].map((r, i) => (
            <ellipse key={r} rx={r} ry={r * 0.82} transform={`rotate(${i * 7})`} />
          ))}
        </g>
      );
    case 'devotional':
      return (
        <g transform="translate(0 186)" fill={c}>
          <path d="M0 -30 C9 -14 13 -4 13 5 A13 13 0 0 1 -13 5 C-13 -4 -9 -14 0 -30Z" />
          <path d="M-30 22 Q0 8 30 22 Q0 32 -30 22Z" opacity="0.8" />
        </g>
      );
    case 'fresh':
      return (
        <g transform="translate(0 186)" fill="none" stroke={c} strokeWidth="1.2">
          <path d="M0 30 C0 6 0 -10 0 -32" />
          {[-20, -6, 8].map((y, i) => (
            <g key={y}>
              <path d={`M0 ${y} C ${12 + i * 2} ${y - 6} ${20 - i * 2} ${y - 16} ${18 - i * 3} ${y - 22} C ${8} ${y - 18} ${2} ${y - 10} 0 ${y}`} />
              <path d={`M0 ${y + 6} C ${-12 - i * 2} ${y} ${-20 + i * 2} ${y - 10} ${-18 + i * 3} ${y - 16} C -8 ${y - 12} -2 ${y - 4} 0 ${y + 6}`} />
            </g>
          ))}
        </g>
      );
  }
}

/**
 * A cusped (multifoil) arch outline: straight jambs up to the springline at
 * `y0`, then `lobes` scallops around a pointed crown. Centred on x = cx.
 */
export function archPath(cx: number, y0: number, r: number, lobes: number, bottom?: number): string {
  const yb = bottom ?? y0 + r * 1.5;
  const pts: [number, number][] = [];
  for (let i = 0; i <= lobes; i++) {
    const a = Math.PI - (i / lobes) * Math.PI;
    // Slightly pointed crown: stretch the upper half.
    const lift = 1 + 0.32 * Math.pow(Math.sin(a), 6);
    pts.push([cx + Math.cos(a) * r, y0 - Math.sin(a) * r * lift]);
  }
  let d = `M${cx - r} ${yb} L${cx - r} ${y0}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i]!;
    const [px, py] = pts[i - 1]!;
    const chord = Math.hypot(x - px, y - py);
    d += ` A${(chord * 0.62).toFixed(2)} ${(chord * 0.62).toFixed(2)} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  d += ` L${cx + r} ${yb} Z`;
  return d;
}

/* ------------------------------------------------------------------ */
/* Incense stick in a brass holder                                     */
/* ------------------------------------------------------------------ */

/**
 * The ember is exposed through the forwarded ref so the smoke canvas can
 * anchor its source to it, wherever layout puts the holder.
 */
export const IncenseHolder = forwardRef<SVGCircleElement, {className?: string; lit?: boolean}>(function IncenseHolder({className = '', lit = true}, emberRef) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 160 420" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a3f1c" />
          <stop offset="0.35" stopColor="#d9b46a" />
          <stop offset="0.55" stopColor="#f3dca0" />
          <stop offset="1" stopColor="#6b4a1f" />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b2416" />
          <stop offset="0.5" stopColor="#7a4a2a" />
          <stop offset="1" stopColor="#2c1a10" />
        </linearGradient>
        <radialGradient id={`${id}e`}>
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.3" stopColor="#ffb347" />
          <stop offset="0.7" stopColor="#d2461b" stopOpacity="0.6" />
          <stop offset="1" stopColor="#d2461b" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Stick, tilted slightly */}
      <g transform="rotate(8 80 380)">
        <rect x="78.5" y="150" width="3" height="230" fill="#c9a77a" />
        <rect x="77.2" y="64" width="5.6" height="90" rx="2.6" fill={`url(#${id}s)`} />
        <rect x="77.6" y="58" width="4.8" height="10" rx="2.4" fill="#4a4440" />
        {lit && (
          <>
            <circle cx="80" cy="60" r="16" fill={`url(#${id}e)`} style={{animation: 'ember-pulse 2.6s ease-in-out infinite'}} />
            <circle ref={emberRef} cx="80" cy="57" r="2.2" fill="#fff1c7" />
          </>
        )}
        {!lit && <circle ref={emberRef} cx="80" cy="57" r="0.1" fill="none" />}
      </g>
      {/* Brass dish */}
      <ellipse cx="80" cy="392" rx="70" ry="13" fill="#000" opacity="0.4" />
      <path d="M12 382 Q80 412 148 382 L142 376 Q80 398 18 376 Z" fill={`url(#${id}b)`} />
      <ellipse cx="80" cy="377" rx="62" ry="9" fill="#a37f3e" />
      <ellipse cx="80" cy="376" rx="58" ry="7" fill="#7a5a28" />
      <ellipse cx="80" cy="378" rx="10" ry="3" fill="#2a1d10" />
      {/* Fallen ash */}
      <path d="M44 376 q3 -2 7 0 M104 378 q3 -1.6 6 0" stroke="#bdb5aa" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  );
});

/* ------------------------------------------------------------------ */
/* Architecture                                                        */
/* ------------------------------------------------------------------ */

/** Sandstone wall with a cusped arch opening, lit from beyond. */
export function ArchWall({className = '', light = '#e9b86a'}: {className?: string; light?: string}) {
  const id = useId().replace(/:/g, '');
  const arch = archPath(600, 470, 250, 9, 1000);
  return (
    <svg viewBox="0 0 1200 1000" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}l`} cx="0.5" cy="0.62" r="0.55">
          <stop offset="0" stopColor={light} stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#a8622a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#2a1a10" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a120d" />
          <stop offset="0.6" stopColor="#2a1c13" />
          <stop offset="1" stopColor="#140e0a" />
        </linearGradient>
        <radialGradient id={`${id}r`} cx="0.5" cy="0.55" r="0.6">
          <stop offset="0" stopColor="#d7a466" stopOpacity="0.35" />
          <stop offset="1" stopColor="#d7a466" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}j`} width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M17 0 L34 17 L17 34 L0 17Z" fill="none" stroke="#c7a15a" strokeWidth="1" opacity="0.5" />
          <circle cx="17" cy="17" r="3" fill="none" stroke="#c7a15a" strokeWidth="0.8" opacity="0.5" />
        </pattern>
      </defs>
      {/* Light beyond the arch */}
      <rect width="1200" height="1000" fill="#120c09" />
      <rect width="1200" height="1000" fill={`url(#${id}l)`} />
      {/* Jali screen glimpsed through the opening */}
      <path d={archPath(600, 520, 150, 7, 1000)} fill={`url(#${id}j)`} opacity="0.35" />
      {/* The wall, with the arch cut out */}
      <path d={`M0 0 H1200 V1000 H0 Z ${arch}`} fill={`url(#${id}w)`} fillRule="evenodd" />
      {/* Light spilling onto the wall around the opening */}
      <path d={`M0 0 H1200 V1000 H0 Z ${arch}`} fill={`url(#${id}r)`} fillRule="evenodd" />
      {/* Carved border tracing the arch */}
      <path d={archPath(600, 470, 268, 9, 1000)} fill="none" stroke="#c7a15a" strokeOpacity="0.22" strokeWidth="2" />
      <path d={archPath(600, 470, 284, 9, 1000)} fill="none" stroke="#c7a15a" strokeOpacity="0.1" strokeWidth="1" />
    </svg>
  );
}

/** Two dark pillars framing the view — the nearest architectural layer. */
export function Pillars({className = ''}: {className?: string}) {
  const col = (x: number, flip: boolean) => (
    <g transform={flip ? `translate(${x} 0) scale(-1 1)` : `translate(${x} 0)`}>
      <rect x="0" y="0" width="150" height="1000" fill="#0c0806" />
      <rect x="150" y="0" width="14" height="1000" fill="#1a110c" />
      <rect x="0" y="140" width="190" height="26" fill="#0c0806" />
      <rect x="0" y="820" width="200" height="40" fill="#0c0806" />
      <path d="M150 166 Q182 180 164 220 L150 220Z" fill="#0c0806" />
      <line x1="164" y1="0" x2="164" y2="1000" stroke="#c7a15a" strokeOpacity="0.18" />
    </g>
  );
  return (
    <svg viewBox="0 0 1200 1000" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      {col(0, false)}
      {col(1200, true)}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Product image: real photo when supplied, concept pack otherwise      */
/* ------------------------------------------------------------------ */

export function ProductVisual({product, className = '', imgClassName = ''}: {product: Product; className?: string; imgClassName?: string}) {
  const img = product.images[0];
  if (img) {
    return (
      <img
        src={img.src}
        alt={img.alt}
        width={img.width}
        height={img.height}
        loading="lazy"
        decoding="async"
        className={`${className} ${imgClassName} object-contain`}
      />
    );
  }
  return <PackMockup mood={product.mood} className={className} />;
}

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */

/** The supplied logo when configured; a typographic placeholder until then. */
export function Logo({className = '', tone = 'light'}: {className?: string; tone?: 'light' | 'dark'}) {
  if (brand.logo) {
    return <img src={brand.logo.src} alt={brand.logo.alt} width={brand.logo.width} height={brand.logo.height} className={`h-9 w-auto ${className}`} />;
  }
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 24 32" aria-hidden="true" className={`h-7 w-auto ${tone === 'light' ? 'text-gold' : 'text-saffron-deep'}`}>
        <path d="M12 2c3.4 5 5.2 8.6 5.2 11.6a5.2 5.2 0 0 1-10.4 0C6.8 10.6 8.6 7 12 2Z" fill="currentColor" />
        <rect x="11.1" y="20" width="1.8" height="10" rx="0.9" fill="currentColor" opacity="0.7" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.375rem] font-semibold tracking-[0.04em]">{brand.shortName}</span>
        <span className="mt-0.5 font-mono text-[0.5625rem] tracking-[0.42em] uppercase opacity-70">{brand.descriptor}</span>
      </span>
    </span>
  );
}
