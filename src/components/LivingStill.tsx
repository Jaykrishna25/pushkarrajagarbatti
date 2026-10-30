import {useEffect, useRef, type ReactNode} from 'react';
import type {Mood} from '../data/products';
import {useReducedMotion} from '../hooks/useReducedMotion';
import {isOnScreen, lerp, passProgress} from '../lib/math';
import {onFrame} from '../lib/scroll';
import {Smoke} from '../lib/smoke';
import {IncenseHolder, PackMockup} from './Art';

/**
 * A "photograph" that breathes: a lit stick in its holder (optionally beside
 * a pack) on a warm ground, with live smoke. As the frame passes through
 * the viewport its contents drift against the frame for depth. The smoke
 * only renders while the frame is on screen.
 */
export function LivingStill({
  mood,
  className = '',
  light = 'rgba(255,200,130,0.5)',
  children,
  composition = 'holder-pack',
  groupClassName = 'bottom-[14%] h-[62%]',
}: {
  mood?: Mood;
  className?: string;
  light?: string;
  children?: ReactNode;
  composition?: 'holder-pack' | 'holder';
  groupClassName?: string;
}) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emberRef = useRef<SVGCircleElement>(null);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    const smoke = new Smoke(canvasRef.current!, {strands: 3, motes: 26, wisps: 36, seed: 19});
    let drawnStill = false;
    const off = onFrame((time) => {
      const root = rootRef.current;
      const canvas = canvasRef.current;
      if (!root || !canvas) return;
      const {p, rect, vh} = passProgress(root);
      if (!isOnScreen(rect, vh, 40)) return;
      const still = reducedRef.current;
      if (still && drawnStill) return;
      if (!still && innerRef.current) innerRef.current.style.transform = `translate3d(0, ${lerp(4, -4, p)}%, 0) scale(1.08)`;
      const e = emberRef.current?.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      smoke.draw(time, {
        source: e ? {x: e.left + e.width / 2 - c.left, y: e.top + e.height / 2 - c.top} : null,
        intensity: 0.9,
        reach: 0.95,
        lean: 30,
        motes: 0.7,
        still,
      });
      drawnStill = still;
    });
    return () => {
      off();
      smoke.destroy();
    };
  }, []);

  return (
    <div ref={rootRef} className={`grain relative overflow-hidden bg-ink ${className}`}>
      <div ref={innerRef} className="absolute inset-0 will-change-transform" style={{transform: 'scale(1.08)'}}>
        <div aria-hidden="true" className="absolute inset-0" style={{background: `radial-gradient(70% 60% at 50% 62%, ${light}, rgba(60,30,15,0.25) 55%, transparent 80%), linear-gradient(180deg, #1a120d, #2a1c13 70%, #3a2818)`}} />
        {/* Ledge */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[22%] bg-[linear-gradient(180deg,#4a3422,#2a1c13)]" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-[22%] h-px bg-gold/25" />
        <div className={`absolute inset-x-0 flex items-end justify-center ${groupClassName}`}>
          <IncenseHolder ref={emberRef} className={`relative z-10 h-[86%] w-auto ${composition === 'holder-pack' ? '-mr-[4%]' : ''}`} />
          {composition === 'holder-pack' && mood && <PackMockup mood={mood} className="h-full w-auto drop-shadow-[0_24px_30px_rgba(0,0,0,0.55)]" />}
        </div>
      </div>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_40%,transparent_55%,rgba(10,7,5,0.6))]" />
      {children}
    </div>
  );
}
