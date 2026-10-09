/**
 * VerificationSim — landing page interactive simulation panel
 *
 * Constraints:
 * - No camera access, no real network calls
 * - All numeric readouts tagged [SIM]
 * - One state machine: { scenario, stageIdx, playing }
 * - Autoplays when in viewport, pauses when out
 * - Honors prefers-reduced-motion (static final frame)
 * - aria-live region announces stage changes and final outcome
 * - WCAG AA: outcome conveyed by text + shape, not color alone
 */
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
} from 'react';
import {
  type SimScenario,
  type SimOutcome,
  type SimStage,
  SIM_SCENARIOS,
  SIM_STAGES,
  TERMINAL_STAGE,
  buildPulsePath,
} from '../simulation';

export type { SimScenario, SimOutcome, SimStage };


// ─────────────────────────────────────────────────────────────────────────────
// Reticle lock SVG — animated brackets
// ─────────────────────────────────────────────────────────────────────────────
const BRACKET_SIZE = 14;
const BRACKET_THICKNESS = 2;
function ReticleBrackets({ locked, cx, cy, rx, ry }: {
  locked: boolean; cx: number; cy: number; rx: number; ry: number
}) {
  const corners = [
    { x: cx - rx, y: cy - ry, dxL: BRACKET_SIZE, dyL: 0, dxR: 0, dyR: BRACKET_SIZE },
    { x: cx + rx, y: cy - ry, dxL: -BRACKET_SIZE, dyL: 0, dxR: 0, dyR: BRACKET_SIZE },
    { x: cx - rx, y: cy + ry, dxL: BRACKET_SIZE, dyL: 0, dxR: 0, dyR: -BRACKET_SIZE },
    { x: cx + rx, y: cy + ry, dxL: -BRACKET_SIZE, dyL: 0, dxR: 0, dyR: -BRACKET_SIZE },
  ];
  const color = locked ? 'var(--ok)' : 'var(--mut)';
  return (
    <>
      {corners.map((c, i) => (
        <g key={i} stroke={color} strokeWidth={BRACKET_THICKNESS} fill="none">
          <line x1={c.x} y1={c.y} x2={c.x + c.dxL} y2={c.y + c.dyL} />
          <line x1={c.x} y1={c.y} x2={c.x + c.dxR} y2={c.y + c.dyR} />
        </g>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Human silhouette SVG (abstract — no photo, no realistic face)
// ─────────────────────────────────────────────────────────────────────────────
function Silhouette({ stageIdx }: { stageIdx: number }) {
  const opacity = stageIdx >= 0 ? 1 : 0.3;
  return (
    <g aria-hidden="true" opacity={opacity} style={{ transition: 'opacity 0.5s' }}>
      {/* head */}
      <ellipse cx="100" cy="56" rx="28" ry="32" fill="var(--soft)" />
      {/* neck */}
      <rect x="92" y="86" width="16" height="12" fill="var(--soft)" />
      {/* shoulders */}
      <path d="M 50 120 Q 68 98 100 98 Q 132 98 150 120 L 155 140 L 45 140 Z" fill="var(--soft)" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export interface VerificationSimProps {
  /** Which stage is highlighted in the How-It-Works section (controlled externally) */
  externalHighlightStage?: number | null;
  /** Called when the user clicks a stage row (so HiW section can sync) */
  onStageClick?: (idx: number) => void;
}

export const VerificationSim: React.FC<VerificationSimProps> = ({
  externalHighlightStage,
  onStageClick,
}) => {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0); // ms elapsed when paused

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [scenario, setScenario] = useState<SimScenario>('live');
  const [stageIdx, setStageIdx] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(!prefersReducedMotion);
  const [elapsed, setElapsed] = useState<number>(0);
  const [done, setDone] = useState<boolean>(false);
  const [tick, setTick] = useState<number>(0); // animation tick for pulse

  const liveRegionRef = useRef<HTMLDivElement>(null);
  const announce = (msg: string) => {
    if (liveRegionRef.current) liveRegionRef.current.textContent = msg;
  };

  // Compute which stage should be active from elapsed time
  const stageFromElapsed = useCallback((ms: number, sc: SimScenario): { idx: number; done: boolean } => {
    const terminal = TERMINAL_STAGE[sc];
    let accumulated = 0;
    for (let i = 0; i <= terminal; i++) {
      accumulated += SIM_STAGES[i].durationMs;
      if (ms < accumulated) return { idx: i, done: false };
    }
    return { idx: terminal, done: true };
  }, []);

  // Animation loop
  const runLoop = useCallback(() => {
    const now = performance.now();
    const ms = pausedAtRef.current + (now - startTimeRef.current);
    const terminal = TERMINAL_STAGE[scenario];
    const maxMs = SIM_STAGES.slice(0, terminal + 1).reduce((s, st) => s + st.durationMs, 0) + 1000;

    if (ms >= maxMs) {
      setElapsed(maxMs);
      setStageIdx(terminal);
      setDone(true);
      const out = SIM_SCENARIOS[scenario].outcome;
      announce(`Simulation complete. ${out.label}. ${out.reason}`);
      return;
    }

    const { idx } = stageFromElapsed(ms, scenario);
    setElapsed(ms);
    setStageIdx((prev) => {
      if (prev !== idx) {
        announce(`Stage ${idx + 1} of ${SIM_STAGES.length}: ${SIM_STAGES[idx].label}`);
      }
      return idx;
    });
    setTick((t) => t + 1);
    rafRef.current = requestAnimationFrame(runLoop);
  }, [scenario, stageFromElapsed]);

  // Start / pause control
  useEffect(() => {
    if (prefersReducedMotion) {
      // Show static final frame
      const terminal = TERMINAL_STAGE[scenario];
      setStageIdx(terminal);
      setDone(true);
      return;
    }

    if (playing && !done) {
      startTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(runLoop);
    } else {
      cancelAnimationFrame(rafRef.current);
      if (!done) {
        pausedAtRef.current = elapsed;
      }
    }
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, done, scenario]);

  // Restart when scenario changes
  const restartSim = useCallback((sc: SimScenario) => {
    cancelAnimationFrame(rafRef.current);
    setScenario(sc);
    setStageIdx(0);
    setElapsed(0);
    setDone(false);
    pausedAtRef.current = 0;
    startTimeRef.current = performance.now();
    announce(`Scenario changed: ${SIM_SCENARIOS[sc].label}. Starting simulation.`);
    if (!prefersReducedMotion) {
      setPlaying(true);
    }
  }, [prefersReducedMotion]);

  // Auto-play / pause on viewport visibility
  useEffect(() => {
    if (prefersReducedMotion || !panelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlaying(true);
        } else {
          setPlaying(false);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(panelRef.current);
    return () => obs.disconnect();
  }, [prefersReducedMotion]);

  // After done: loop after 2s pause
  useEffect(() => {
    if (!done || !playing || prefersReducedMotion) return;
    const t = setTimeout(() => {
      setStageIdx(0);
      setElapsed(0);
      setDone(false);
      pausedAtRef.current = 0;
      startTimeRef.current = performance.now();
    }, 2000);
    return () => clearTimeout(t);
  }, [done, playing, prefersReducedMotion, scenario]);

  // Jump to specific stage
  const jumpToStage = (idx: number) => {
    cancelAnimationFrame(rafRef.current);
    const terminal = TERMINAL_STAGE[scenario];
    const targetIdx = Math.min(idx, terminal);
    let ms = 0;
    for (let i = 0; i < targetIdx; i++) ms += SIM_STAGES[i].durationMs;
    pausedAtRef.current = ms;
    startTimeRef.current = performance.now();
    setElapsed(ms);
    setStageIdx(targetIdx);
    setDone(targetIdx === terminal && ms > 0);
    announce(`Jumped to stage ${targetIdx + 1}: ${SIM_STAGES[targetIdx].label}`);
    onStageClick?.(targetIdx);
    if (!prefersReducedMotion) setPlaying(true);
  };

  const handlePlayPause = () => {
    if (done) {
      restartSim(scenario);
    } else {
      setPlaying((p) => !p);
    }
  };

  const outcome = done ? SIM_SCENARIOS[scenario].outcome : null;
  const W_PULSE = 240;
  const H_PULSE = 60;
  const pulsePath = buildPulsePath(scenario, stageIdx, tick, W_PULSE, H_PULSE);

  const isLocked = stageIdx >= 0;
  const CX = 100, CY = 90, RX = 56, RY = 68;

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Verification simulation panel"
      style={{
        border: '2px solid var(--line)',
        background: 'var(--card)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        userSelect: 'none',
      }}
    >
      {/* aria-live region (visually hidden) */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
        }}
      />

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: '2px solid var(--line)',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ font: '500 10px var(--mono)', color: 'var(--mut)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Presence check
        </div>
        <div
          style={{
            font: '500 10px var(--mono)',
            color: 'var(--acc)',
            letterSpacing: '.06em',
            border: '1px solid var(--acc)',
            padding: '2px 6px',
          }}
        >
          SIMULATION · NO CAMERA USED
        </div>
        <div style={{ font: '10px var(--mono)', color: 'var(--mut)' }}>
          {SIM_SCENARIOS[scenario].label}
        </div>
      </div>

      {/* ── Scenario chips ────────────────────────────────────────────────── */}
      <div
        role="radiogroup"
        aria-label="Simulation scenario"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--soft)',
          gap: 0,
        }}
      >
        {(Object.entries(SIM_SCENARIOS) as [SimScenario, typeof SIM_SCENARIOS[SimScenario]][]).map(([key, sc]) => {
          const active = scenario === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => restartSim(key)}
              style={{
                flex: 1,
                padding: '8px 4px',
                border: 'none',
                borderRight: key !== 'screen' ? '1px solid var(--soft)' : 'none',
                background: active ? 'var(--ink)' : 'none',
                color: active ? 'var(--bg)' : 'var(--mut)',
                font: `500 11px var(--mono)`,
                cursor: 'pointer',
                minHeight: 44,
                transition: 'background 0.1s, color 0.1s',
              }}
            >
              {sc.label}
            </button>
          );
        })}
      </div>

      {/* ── Viewport: silhouette + reticle + pulse ────────────────────────── */}
      <div style={{ position: 'relative', background: 'var(--bg)', borderBottom: '1px solid var(--soft)' }}>
        <svg
          width="100%"
          viewBox="0 0 200 150"
          aria-hidden="true"
          style={{ display: 'block' }}
        >
          {/* Grid */}
          {[25, 50, 75, 100, 125, 150, 175].map((x) => (
            <line key={`gx${x}`} x1={x} y1={0} x2={x} y2={150} stroke="var(--soft)" strokeWidth={0.5} />
          ))}
          {[37, 75, 112].map((y) => (
            <line key={`gy${y}`} x1={0} y1={y} x2={200} y2={y} stroke="var(--soft)" strokeWidth={0.5} />
          ))}

          {/* Silhouette */}
          <Silhouette stageIdx={stageIdx} />

          {/* Oval reticle */}
          <ellipse
            cx={CX}
            cy={CY}
            rx={RX}
            ry={RY}
            fill="none"
            stroke={isLocked ? 'var(--ok)' : 'var(--soft)'}
            strokeWidth={1.5}
            strokeDasharray={isLocked ? 'none' : '4 4'}
            style={{ transition: 'stroke 0.4s' }}
          />
          <ReticleBrackets locked={isLocked} cx={CX} cy={CY} rx={RX} ry={RY} />

          {/* HUD: stage label */}
          <text x="160" y="14" textAnchor="end" fontSize="8" fontFamily="var(--mono)" fill="var(--mut)">
            {done ? (outcome?.verdict === 'PASS' ? '✓ PASS' : '✗ REJECTED') : `STAGE ${stageIdx + 1}/6`}
          </text>

          {/* Spoof fail overlay */}
          {done && scenario !== 'live' && (
            <>
              <line x1={CX - RX * 0.7} y1={CY - RY * 0.7} x2={CX + RX * 0.7} y2={CY + RY * 0.7}
                stroke="var(--bad)" strokeWidth={2} />
              <line x1={CX + RX * 0.7} y1={CY - RY * 0.7} x2={CX - RX * 0.7} y2={CY + RY * 0.7}
                stroke="var(--bad)" strokeWidth={2} />
            </>
          )}

          {/* Pulse trace (embedded in viewport) */}
          <g transform="translate(112, 104)">
            <rect x={0} y={0} width={W_PULSE * 0.43} height={H_PULSE * 0.55} fill="var(--card)" opacity="0.9" />
            <text x={2} y={8} fontSize="6" fontFamily="var(--mono)" fill="var(--mut)">PULSE [SIM]</text>
            <g transform="translate(0, 5) scale(0.43, 0.43)">
              <path d={pulsePath} fill="none" stroke="var(--acc)" strokeWidth={2.2} strokeLinejoin="round" />
            </g>
          </g>
        </svg>
      </div>

      {/* ── Stage ledger ─────────────────────────────────────────────────── */}
      <div
        role="list"
        aria-label="Verification pipeline stages"
        style={{ borderBottom: '1px solid var(--soft)' }}
      >
        {SIM_STAGES.map((stage) => {
          const status = stage.getStatus(scenario, done ? TERMINAL_STAGE[scenario] + (done ? 1 : 0) : stageIdx);
          const isActive = !done && stageIdx === stage.idx;
          const isHighlighted = externalHighlightStage === stage.idx;
          const statusDone = done
            ? (scenario === 'live' ? 'done' : stage.idx < 3 ? 'done' : stage.idx === 3 ? 'failed' : 'pending')
            : status;

          return (
            <button
              key={stage.id}
              type="button"
              role="listitem"
              onClick={() => jumpToStage(stage.idx)}
              style={{
                width: '100%',
                background: isHighlighted
                  ? 'var(--ink)'
                  : isActive
                  ? 'var(--bg)'
                  : 'none',
                color: isHighlighted ? 'var(--bg)' : 'var(--ink)',
                border: 'none',
                borderBottom: '1px solid var(--soft)',
                padding: '8px 12px',
                display: 'grid',
                gridTemplateColumns: '20px 1fr auto',
                gap: 8,
                alignItems: 'center',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
                minHeight: 40,
                font: `${isActive ? '600' : '400'} 12px var(--mono)`,
              }}
              aria-label={`Stage ${stage.idx + 1}: ${stage.label}, status: ${statusDone}`}
            >
              <span style={{ font: '10px var(--mono)', color: isHighlighted ? 'var(--bg)' : 'var(--mut)' }}>
                {String(stage.idx + 1).padStart(2, '0')}
              </span>
              <span>{stage.label}</span>
              <span style={{
                font: '10px var(--mono)',
                color: statusDone === 'done'
                  ? 'var(--ok)'
                  : statusDone === 'failed'
                  ? 'var(--bad)'
                  : statusDone === 'active'
                  ? 'var(--acc)'
                  : 'var(--soft)',
              }}>
                {statusDone === 'done' ? '✓ done'
                  : statusDone === 'failed' ? '✗ failed'
                  : statusDone === 'active' ? '● active'
                  : '– –'}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Result area ──────────────────────────────────────────────────── */}
      <div style={{ padding: '12px', minHeight: 70, position: 'relative' }}>
        {done && outcome ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              animation: 'sim-stamp-in 0.25s ease-out',
            }}
            aria-label={`Simulation result: ${outcome.label}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                font: '600 11px var(--mono)',
                padding: '2px 8px',
                border: `2px solid ${outcome.verdict === 'PASS' ? 'var(--ok)' : 'var(--bad)'}`,
                color: outcome.verdict === 'PASS' ? 'var(--ok)' : 'var(--bad)',
                letterSpacing: '.1em',
              }}>
                {outcome.verdict === 'PASS' ? '✓ PASS' : '✗ REJECTED'}
              </span>
              <span style={{ font: '12px var(--sans)', fontWeight: 500 }}>{outcome.label}</span>
            </div>
            <p style={{ font: '11px/1.5 var(--mono)', color: 'var(--mut)', margin: 0 }}>
              {outcome.reason}
            </p>
          </div>
        ) : (
          <div style={{ font: '11px var(--mono)', color: 'var(--soft)' }}>
            {playing ? `Stage ${stageIdx + 1} running…` : 'Paused. Press play to continue.'}
          </div>
        )}
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--soft)',
          padding: '8px 12px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="btn"
          onClick={handlePlayPause}
          aria-label={done ? 'Replay simulation' : playing ? 'Pause simulation' : 'Play simulation'}
          style={{ padding: '6px 14px', fontSize: 11 }}
          id={`${id}-playpause`}
        >
          {done ? '↺ Replay' : playing ? '⏸ Pause' : '▶ Play'}
        </button>
        {!done && !playing && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => jumpToStage(Math.min(stageIdx + 1, TERMINAL_STAGE[scenario]))}
            aria-label="Step to next stage"
            style={{ padding: '6px 12px', fontSize: 11 }}
            id={`${id}-step`}
          >
            Step →
          </button>
        )}
        <span style={{ font: '10px var(--mono)', color: 'var(--mut)', marginLeft: 'auto' }}>
          {SIM_SCENARIOS[scenario].description}
        </span>
      </div>

      <style>{`
        @keyframes sim-stamp-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
