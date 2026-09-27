import { useRef, useState, useEffect } from 'react';
import { Radar, Route, MoveRight, CloudRain, Zap, AlertOctagon, Percent } from 'lucide-react';

const CAPS = [
  { icon: <Radar size={15} aria-hidden="true" />, label: 'Storm Detection' },
  { icon: <Route size={15} aria-hidden="true" />, label: 'Cell Tracking' },
  { icon: <MoveRight size={15} aria-hidden="true" />, label: 'Motion Estimation' },
  { icon: <CloudRain size={15} aria-hidden="true" />, label: 'Rainfall Prediction' },
  { icon: <Zap size={15} aria-hidden="true" />, label: 'Lightning Prediction' },
  { icon: <AlertOctagon size={15} aria-hidden="true" />, label: 'Severity Classification' },
  { icon: <Percent size={15} aria-hidden="true" />, label: 'Confidence Estimation' },
];

/**
 * Central engine node with satellites. Connections are drawn between the
 * core element and each capability chip after layout, purely decoratively
 * (aria-hidden), with animation disabled under prefers-reduced-motion.
 */
export default function EngineOrbit() {
  const wrapRef = useRef(null);
  const coreRef = useRef(null);
  const chipRefs = useRef([]);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    function measure() {
      const wrap = wrapRef.current;
      const core = coreRef.current;
      if (!wrap || !core) return;
      const wb = wrap.getBoundingClientRect();
      const cb = core.getBoundingClientRect();
      const cx = cb.left + cb.width / 2 - wb.left;
      const cy = cb.top + cb.height / 2 - wb.top;
      const next = [];
      chipRefs.current.forEach((chip) => {
        if (!chip) return;
        const b = chip.getBoundingClientRect();
        const x = b.left + b.width / 2 - wb.left;
        const y = b.top + b.height / 2 - wb.top;
        next.push({ x1: cx, y1: cy, x2: x, y2: y });
      });
      setLines(next);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div className="engine-orbit" ref={wrapRef}>
      <svg className="engine-links" aria-hidden="true">
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </svg>
      <div className="engine-core" ref={coreRef}>
        <div className="engine-core__title">STORMSENSE ENGINE</div>
        <div className="engine-core__sub">AI-assisted atmospheric intelligence</div>
      </div>
      {CAPS.map((c, i) => (
        <div key={c.label} className="engine-cap" ref={(el) => (chipRefs.current[i] = el)}>
          {c.icon}
          {c.label}
        </div>
      ))}
    </div>
  );
}
