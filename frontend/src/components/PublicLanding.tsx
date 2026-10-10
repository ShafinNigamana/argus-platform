import React, { useState, useCallback, useId } from 'react';
import { Lock, ArrowRight, Eye } from 'lucide-react';

interface PublicLandingProps {
  onEnterPlatform: (mode?: 'login' | 'register', redirectTarget?: string) => void;
  onViewDemo: () => void;
  onCreateAccount?: () => void;
}

const PIPELINE = [
  { id: 'capture',   num: '01', label: 'Camera capture',  tag: 'CLIENT-SIDE',      detail: 'Browser MediaDevices API acquires a live camera stream in-browser. No video is stored—only transient frame data is used during the session.' },
  { id: 'signal',    num: '02', label: 'Pulse signal',     tag: 'CLIENT-SIDE',      detail: 'The green optical channel (520-560 nm) is sampled to detect microscopic capillary expansion from cardiac cycles. A flat or absent signal is evidence against presence.' },
  { id: 'challenge', num: '03', label: 'Reflex challenge', tag: 'SERVER-SIDE',      detail: 'Randomised blink, head-pose, or hold-still instructions with millisecond-bounded evaluation. Static images and video loops cannot satisfy a fresh nonce.' },
  { id: 'spoof',     num: '04', label: 'Spoof check',      tag: 'SERVER-SIDE ONNX', detail: 'UltraFace Slim 320 locates the face; MiniFASNetV2-SE classifies it as live, printed medium, or screen replay. Multiple faces cause immediate rejection.' },
  { id: 'fusion',    num: '05', label: 'Signal fusion',    tag: 'AUTHORITATIVE',    detail: 'Component scores from each signal are fused by the backend decision engine. The authoritative verdict-PRESENCE_CONFIRMED, PRESENCE_NOT_CONFIRMED, or INCONCLUSIVE-is issued.' },
  { id: 'record',    num: '06', label: 'Signed record',    tag: 'CRYPTOGRAPHIC',    detail: 'A canonical JSON attestation is signed via Google Cloud KMS (asymmetric) or SHA-256 integrity hash (fallback). Only scalar scores persist, no image or video.' },
] as const;

import {
  SIGNALS,
  illustrativeConf,
  illustrativeVerdict,
  CAPABILITIES,
  type SignalItem,
} from '../landingData';


const PRIVACY_NODES = [
  { id: 'camera',  label: 'Camera',  detail: 'Browser MediaDevices API - only in-browser; no stream leaves the device.' },
  { id: 'browser', label: 'Browser', detail: 'rPPG pulse extracted locally. A single 320x240 JPEG snapshot is sent to the server; the raw stream is never transmitted.' },
  { id: 'server',  label: 'Server',  detail: 'ONNX pipeline processes the snapshot transiently. The image is discarded immediately after scoring, never written to the database.' },
  { id: 'record',  label: 'Record',  detail: 'Only scalar scores, a verdict, a reason code, and a signed certificate are persisted. No biometric template is stored.' },
] as const;

const LIMITS_DOES = [
  { id: 'presence', label: 'Point-in-time presence evaluation', detail: 'Answers: was a live human present at this specific moment?' },
  { id: 'liveness', label: 'Multi-signal liveness',             detail: 'Three independent signals: physiological pulse, behavioral challenge, ONNX presentation-attack detection.' },
  { id: 'cert',     label: 'Produces a signed record',          detail: 'KMS asymmetric signature or SHA-256 integrity hash. Downstream systems can verify the signature independently.' },
  { id: 'thresh',   label: 'Operator-configurable threshold',   detail: 'Default confidence threshold is 80%. Operators can adjust it per policy for their risk appetite.' },
];
const LIMITS_DOES_NOT = [
  { id: 'kyc',      label: 'Verify identity or documents',        detail: 'Argus does not know who you are. Pair with a separate KYC provider for identity assurance.' },
  { id: 'biom',     label: 'Store biometric templates',           detail: 'No face embedding, no face recognition. The certificate cannot reconstruct a face.' },
  { id: 'deepfake', label: 'Detect deepfake media',               detail: 'Argus evaluates physical presence, not media authenticity. A capable synthetic video attack is not ruled out.' },
  { id: 'proctor',  label: 'Continuous proctoring',               detail: 'Argus evaluates a single point-in-time event, not an ongoing session.' },
  { id: 'pubverif', label: 'Provide a public certificate lookup', detail: 'There is no public verification API. Certificate lookup requires authentication.' },
];

const SAMPLE_SUMMARY: [string, string][] = [
  ['Verification ID', 'argus-sim-0000-0000'],
  ['Verdict',         'PRESENCE_CONFIRMED'],
  ['Confidence',      '0.91'],
  ['Component scores','liveness 0.88 challenge 0.94 spoof 0.92'],
  ['Issued',          '2026-01-01T00:00:00Z'],
  ['Expires',         '2026-01-02T00:00:00Z'],
  ['Signing mode',    'SHA256_FALLBACK (no KMS key in this env)'],
  ['Revoked',         'false'],
];

const SAMPLE_JSON = JSON.stringify({
  certificateId: 'argus-sim-0000-0000',
  verificationId: 'sim-ver-00000000',
  certificateData: {
    userId: 'sample_user',
    operationType: 'TRANSACTION_SIGNING',
    confidenceScore: 0.91,
    componentScores: { liveness: 0.88, challenge: 0.94, behavior: 0.92 },
    issuedAt: '2026-01-01T00:00:00Z',
    expiresAt: '2026-01-02T00:00:00Z',
    issuer: 'argus-platform',
  },
  signature: 'ARGUS-PLATFORM-LOCAL-SHA256-SAMPLE',
  publicKey: 'ARGUS-PLATFORM-LOCAL-SHA256',
  signingMode: 'SHA256_FALLBACK',
  revoked: false,
}, null, 2);

const W = 'clamp(16px, 4vw, 60px)';

function SectionLabel({ label, id }: { label: string; id?: string }) {
  return <div id={id} style={{ font: '500 11px var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mut)', marginBottom: 10 }}>{label}</div>;
}

function SectionH2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ font: '400 clamp(26px,3.5vw,44px)/1.05 var(--ser)', letterSpacing: '-0.01em', marginBottom: 6 }}>{children}</h2>;
}

function IllustrativeTag() {
  return <span style={{ font: '500 9px var(--mono)', letterSpacing: '.08em', border: '1px solid var(--wn)', color: 'var(--wn)', padding: '1px 5px', display: 'inline-block', verticalAlign: 'middle', marginLeft: 8 }}>ILLUSTRATIVE EXAMPLE</span>;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({ onEnterPlatform, onViewDemo }) => {
  const certTabId = useId();

  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  const [enabledSignals, setEnabledSignals] = useState<Set<string>>(new Set(SIGNALS.map((s: SignalItem) => s.id)));
  const conf = illustrativeConf(enabledSignals);
  const verdict = illustrativeVerdict(conf);

  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [activeDoesChip, setActiveDoesChip] = useState<string | null>(null);
  const [activeDoesNotChip, setActiveDoesNotChip] = useState<string | null>(null);
  const [certTab, setCertTab] = useState<'summary' | 'json'>('summary');

  const handleStageClick = useCallback((idx: number) => {
    setExpandedStage((prev) => (prev === idx ? null : idx));
  }, []);

  const toggleSignal = (id: string) => {
    setEnabledSignals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size === 1) return prev; next.delete(id); } else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh', fontFamily: 'var(--sans)' }}>
      {/* Skip Link for Accessibility */}
      <a
        href="#hero"
        style={{
          position: 'absolute',
          top: -9999,
          left: -9999,
          background: 'var(--ink)',
          color: 'var(--bg)',
          padding: '8px 16px',
          zIndex: 9999,
          textDecoration: 'none',
          font: '500 12px var(--mono)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.top = '8px';
          e.currentTarget.style.left = '8px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.top = '-9999px';
          e.currentTarget.style.left = '-9999px';
        }}
      >
        Skip to main content
      </a>

      {/* Header */}
      <header style={{ borderBottom: '2px solid var(--line)', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${W}`, height: 56, gap: 12 }}>
        <div style={{ font: '400 24px var(--ser)', display: 'flex', alignItems: 'baseline', gap: 7, flexShrink: 0 }}>
          Argus <small style={{ font: '500 10px var(--mono)', color: 'var(--mut)', letterSpacing: '.08em' }}>PLATFORM</small>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          {['How it works', 'Privacy', 'Limits', 'Capabilities'].map((lbl) => (
            <a key={lbl} href={`#${lbl.toLowerCase().replace(/\s+/g, '-')}`}
              style={{ font: '500 11px var(--mono)', color: 'var(--mut)', textDecoration: 'none', padding: '0 12px', lineHeight: '54px' }}>{lbl}</a>
          ))}
          <button
            type="button"
            className="btn ghost"
            onClick={() => onEnterPlatform('login')}
            style={{ marginLeft: 8, padding: '6px 14px', fontSize: 12 }}
            id="landing-header-login-btn"
          >
            Sign In
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onEnterPlatform('register')}
            style={{ marginLeft: 6, padding: '6px 14px', fontSize: 12 }}
            id="landing-header-register-btn"
          >
            Create Account
          </button>
        </nav>
      </header>

      {/* A: HERO */}
      <section
        id="hero"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '2px solid var(--line)',
          padding: `clamp(64px, 8vw, 120px) ${W}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 'clamp(520px, 68vh, 680px)',
        }}
        className="landing-hero"
      >
        {/* Technical Calibration Grid Overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(to right, var(--soft) 1px, transparent 1px),
              linear-gradient(to bottom, var(--soft) 1px, transparent 1px)
            `,
            backgroundSize: '56px 56px',
            opacity: 0.55,
            maskImage: 'radial-gradient(ellipse 75% 70% at 50% 50%, black 35%, transparent 95%)',
            WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 50%, black 35%, transparent 95%)',
            zIndex: 1,
          }}
        />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 760 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="eyebrow">Human Verification Platform</div>
            <div
              style={{
                font: '500 10px var(--mono)',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                border: '1px solid var(--line)',
                padding: '2px 8px',
                color: 'var(--mut)',
                background: 'var(--card)',
              }}
            >
              Point-in-time check · Not continuous monitoring
            </div>
          </div>
          <h1 style={{ font: '400 clamp(42px, 6.5vw, 78px)/0.96 var(--ser)', letterSpacing: '-0.02em', marginBottom: 20 }}>
            Is a live human<br />present{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--acc)' }}>right now?</em>
          </h1>
          <p style={{ font: '15px/1.65 var(--sans)', color: 'var(--mut)', maxWidth: '52ch', margin: '0 auto 32px' }}>
            Argus evaluates whether sufficient evidence exists that a live human was physically present,
            combining physiological, behavioral, and cryptographic signals.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => onEnterPlatform('register')}
              style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
              id="landing-hero-register-btn"
            >
              <Lock size={14} /> Create Account <ArrowRight size={14} />
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => onEnterPlatform('login')}
              style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
              id="landing-hero-login-btn"
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={onViewDemo}
              style={{ fontSize: 14 }}
              id="landing-hero-demo-btn"
            >
              View Assessment Demo
            </button>
          </div>
        </div>
      </section>

      {/* B: HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: `clamp(32px,5vw,72px) ${W}`, borderBottom: '2px solid var(--line)' }}>
        <SectionLabel label="How it works" id="how-it-works" />
        <SectionH2>Six stages from camera to signed record</SectionH2>
        <p style={{ font: '13px/1.6 var(--sans)', color: 'var(--mut)', maxWidth: '52ch', marginBottom: 28 }}>
          Click a stage for details on its role in the verification pipeline.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 0 }} className="landing-pipe-strip">
          {PIPELINE.map((stage, i) => {
            const isExpanded = expandedStage === i;
            return (
              <button key={stage.id} type="button" onClick={() => handleStageClick(i)} aria-expanded={isExpanded} aria-controls={`stage-detail-${i}`}
                style={{ background: isExpanded ? 'var(--card)' : 'none', color: 'var(--ink)', border: '2px solid var(--line)', marginLeft: i === 0 ? 0 : -2, padding: '14px 12px', textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s,color 0.15s', minHeight: 80, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ font: '500 10px var(--mono)', color: 'var(--acc)', letterSpacing: '.06em' }}>{stage.num}</span>
                <span style={{ font: '400 14px var(--ser)' }}>{stage.label}</span>
                <span style={{ font: '9px var(--mono)', color: 'var(--mut)', opacity: 0.8 }}>{stage.tag}</span>
              </button>
            );
          })}
        </div>
        {expandedStage !== null && (
          <div id={`stage-detail-${expandedStage}`} style={{ marginTop: -2, border: '2px solid var(--line)', borderTop: '2px solid var(--acc)', padding: '16px 20px', background: 'var(--card)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <span style={{ font: '500 32px/1 var(--ser)', color: 'var(--soft)', flexShrink: 0 }}>{PIPELINE[expandedStage].num}</span>
            <div>
              <div style={{ font: '500 13px var(--sans)', marginBottom: 4 }}>{PIPELINE[expandedStage].label}</div>
              <p style={{ font: '13px/1.6 var(--sans)', color: 'var(--mut)', margin: 0 }}>{PIPELINE[expandedStage].detail}</p>
            </div>
            <button type="button" onClick={() => setExpandedStage(null)} style={{ background: 'none', border: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: 16, marginLeft: 'auto', flexShrink: 0, padding: '0 4px' }} aria-label="Close detail">x</button>
          </div>
        )}
      </section>

      {/* C: SIGNALS TOGGLE */}
      <section style={{ padding: `clamp(32px,5vw,72px) ${W}`, borderBottom: '2px solid var(--line)' }} aria-label="Signal contribution illustration">
        <SectionLabel label="Multiple signals" />
        <SectionH2>Three signals, one verdict <IllustrativeTag /></SectionH2>
        <p style={{ font: '13px/1.6 var(--sans)', color: 'var(--mut)', maxWidth: '52ch', marginBottom: 28 }}>
          Toggle each signal off to see how removing evidence changes the illustrative outcome.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 0 }} className="landing-sig-grid">
          <div className="box-card" style={{ padding: 20 }}>
            {SIGNALS.map((sig: SignalItem) => {
              const on = enabledSignals.has(sig.id);
              return (
                <div key={sig.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--soft)' }}>
                  <button type="button" role="switch" aria-checked={on} aria-label={`${on ? 'Disable' : 'Enable'} ${sig.label}`} onClick={() => toggleSignal(sig.id)}
                    style={{ width: 44, height: 26, background: on ? 'var(--ok)' : 'var(--soft)', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.15s' }}>
                    <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, background: 'var(--card)', transition: 'left 0.15s', display: 'block' }} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ font: '500 13px var(--sans)', color: on ? 'var(--ink)' : 'var(--mut)' }}>{sig.label}</div>
                    <div style={{ font: '11px var(--mono)', color: 'var(--mut)', marginTop: 2 }}>Weight: {Math.round(sig.contribution * 100)}% [ILLUSTRATIVE]</div>
                  </div>
                  <span style={{ font: '12px var(--mono)', color: on ? 'var(--ok)' : 'var(--mut)' }}>{on ? 'ON' : 'OFF'}</span>
                </div>
              );
            })}
          </div>
          <div className="box-card" style={{ padding: 20, marginLeft: -2, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className="stat-label">Illustrative confidence</div>
              <div style={{ display: 'flex', gap: 2, marginTop: 8, marginBottom: 4 }}>
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} style={{ flex: 1, height: 12, background: i < Math.round(conf * 20) ? (conf >= 0.8 ? 'var(--ok)' : conf >= 0.5 ? 'var(--wn)' : 'var(--bad)') : 'var(--soft)', transition: 'background 0.2s' }} />
                ))}
              </div>
              <div style={{ font: '400 40px/1 var(--ser)', margin: '4px 0 2px' }}>
                {Math.round(conf * 100)}<small style={{ font: '12px var(--mono)', color: 'var(--mut)' }}>%</small>
              </div>
              <div style={{ font: '10px var(--mono)', color: 'var(--mut)' }}>vs 80% default threshold</div>
            </div>
            <div style={{ padding: '12px', border: `2px solid ${verdict.ok ? 'var(--ok)' : 'var(--bad)'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ font: '600 11px var(--mono)', color: verdict.ok ? 'var(--ok)' : 'var(--bad)' }}>{verdict.ok ? 'PASS' : 'FAIL'}</span>
              <span style={{ font: '500 12px var(--mono)', color: verdict.ok ? 'var(--ok)' : 'var(--bad)' }}>{verdict.label}</span>
            </div>
            <p style={{ font: '11px/1.5 var(--mono)', color: 'var(--mut)', margin: 0, marginTop: 'auto' }}>
              Weights shown here are illustrative. Real weights are set by the backend decision engine.
            </p>
          </div>
        </div>
      </section>

      {/* D: PRIVACY */}
      <section id="privacy" style={{ padding: `clamp(32px,5vw,72px) ${W}`, borderBottom: '2px solid var(--line)' }}>
        <SectionLabel label="Privacy" id="privacy" />
        <SectionH2>Follow the data</SectionH2>
        <p style={{ font: '13px/1.6 var(--sans)', color: 'var(--mut)', maxWidth: '52ch', marginBottom: 32 }}>
          Hover, tap, or focus each node to see one sentence about what happens at that point.
        </p>
        <div style={{ display: 'flex', alignItems: 'stretch', flexWrap: 'wrap' }}>
          {PRIVACY_NODES.map((node, i) => {
            const isActive = activeNode === node.id;
            return (
              <React.Fragment key={node.id}>
                <div role="button" tabIndex={0} aria-pressed={isActive} aria-label={`${node.label}: ${node.detail}`}
                  onMouseEnter={() => setActiveNode(node.id)} onMouseLeave={() => setActiveNode(null)}
                  onFocus={() => setActiveNode(node.id)} onBlur={() => setActiveNode(null)}
                  onClick={() => setActiveNode((p) => (p === node.id ? null : node.id))}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveNode((p) => (p === node.id ? null : node.id))}
                  style={{ flex: '1 1 100px', border: '2px solid var(--line)', padding: '18px 16px', cursor: 'pointer', background: isActive ? 'var(--ink)' : 'var(--card)', color: isActive ? 'var(--bg)' : 'var(--ink)', marginLeft: i === 0 ? 0 : -2, transition: 'background 0.15s,color 0.15s', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 80, outline: 'none' }}>
                  <span style={{ font: '10px var(--mono)', color: isActive ? 'var(--bg)' : 'var(--acc)', letterSpacing: '.06em' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ font: '400 18px var(--ser)' }}>{node.label}</span>
                </div>
                {i < PRIVACY_NODES.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', font: '14px var(--mono)', color: 'var(--mut)', flexShrink: 0, marginLeft: -2, background: 'var(--bg)', border: '2px solid var(--line)', borderLeft: 'none', borderRight: 'none' }}>-&gt;</div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ marginTop: -2, border: '2px solid var(--line)', minHeight: 56, padding: '14px 18px', background: 'var(--bg)', font: '13px/1.6 var(--sans)', color: 'var(--mut)', transition: 'opacity 0.15s', opacity: activeNode ? 1 : 0.5 }}>
          {activeNode ? PRIVACY_NODES.find((n) => n.id === activeNode)?.detail : 'Hover or tap a node above to see what happens at that step.'}
        </div>
      </section>

      {/* E: LIMITS */}
      <section id="limits" style={{ padding: `clamp(32px,5vw,72px) ${W}`, borderBottom: '2px solid var(--line)' }}>
        <SectionLabel label="Limits" id="limits" />
        <SectionH2>What Argus does and does not do</SectionH2>
        <p style={{ font: '13px/1.6 var(--sans)', color: 'var(--mut)', maxWidth: '52ch', marginBottom: 28 }}>Click a chip for one sentence.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }} className="landing-limits-grid">
          <div className="box-card" style={{ padding: 20 }}>
            <div style={{ font: '500 10px var(--mono)', letterSpacing: '.1em', color: 'var(--ok)', marginBottom: 14 }}>WHAT IT DOES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LIMITS_DOES.map((chip) => {
                const active = activeDoesChip === chip.id;
                return (
                  <button key={chip.id} type="button" onClick={() => setActiveDoesChip((p) => (p === chip.id ? null : chip.id))} aria-pressed={active}
                    style={{ padding: '7px 12px', border: `1.5px solid ${active ? 'var(--ok)' : 'var(--soft)'}`, background: active ? 'var(--ok)' : 'none', color: active ? 'var(--card)' : 'var(--ink)', font: '12px var(--sans)', cursor: 'pointer', transition: 'all 0.12s', minHeight: 44 }}>
                    {chip.label}
                  </button>
                );
              })}
            </div>
            {activeDoesChip && <p style={{ font: '12px/1.6 var(--sans)', color: 'var(--mut)', marginTop: 12 }}>{LIMITS_DOES.find((c) => c.id === activeDoesChip)?.detail}</p>}
          </div>
          <div className="box-card" style={{ padding: 20, marginLeft: -2 }}>
            <div style={{ font: '500 10px var(--mono)', letterSpacing: '.1em', color: 'var(--bad)', marginBottom: 14 }}>WHAT IT DOES NOT DO</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LIMITS_DOES_NOT.map((chip) => {
                const active = activeDoesNotChip === chip.id;
                return (
                  <button key={chip.id} type="button" onClick={() => setActiveDoesNotChip((p) => (p === chip.id ? null : chip.id))} aria-pressed={active}
                    style={{ padding: '7px 12px', border: `1.5px solid ${active ? 'var(--bad)' : 'var(--soft)'}`, background: active ? 'var(--bad)' : 'none', color: active ? 'var(--card)' : 'var(--ink)', font: '12px var(--sans)', cursor: 'pointer', transition: 'all 0.12s', minHeight: 44 }}>
                    X {chip.label}
                  </button>
                );
              })}
            </div>
            {activeDoesNotChip && <p style={{ font: '12px/1.6 var(--sans)', color: 'var(--mut)', marginTop: 12 }}>{LIMITS_DOES_NOT.find((c) => c.id === activeDoesNotChip)?.detail}</p>}
          </div>
        </div>
      </section>

      {/* F: SAMPLE RECORD */}
      <section style={{ padding: `clamp(32px,5vw,72px) ${W}`, borderBottom: '2px solid var(--line)' }}>
        <SectionLabel label="Sample record" />
        <SectionH2>What a verification record looks like</SectionH2>
        <p style={{ font: '13px/1.6 var(--sans)', color: 'var(--mut)', maxWidth: '52ch', marginBottom: 24 }}>Toggle between human-readable summary and raw JSON. Static sample, no live data.</p>
        <div style={{ position: 'relative', maxWidth: 680, border: '2px solid var(--line)', background: 'var(--card)', boxShadow: '8px 8px 0 var(--ink)' }}>
          <div style={{ position: 'absolute', right: 16, top: 48, transform: 'rotate(-8deg)', border: '3px solid var(--wn)', color: 'var(--wn)', font: '500 13px var(--mono)', padding: '4px 10px', letterSpacing: '.12em', pointerEvents: 'none', zIndex: 2 }}>SAMPLE</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '2px solid var(--line)', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ font: '500 10px var(--mono)', color: 'var(--mut)', letterSpacing: '.08em' }}>VERIFICATION RECORD</div>
              <div style={{ font: '400 20px var(--ser)', marginTop: 2 }}>Presence Attestation</div>
            </div>
            <div role="tablist" aria-label="Record view" style={{ display: 'flex' }}>
              {(['summary', 'json'] as const).map((tab) => (
                <button key={tab} type="button" role="tab" id={`${certTabId}-tab-${tab}`} aria-selected={certTab === tab} aria-controls={`${certTabId}-panel`} onClick={() => setCertTab(tab)}
                  style={{ padding: '5px 14px', border: '1.5px solid var(--line)', marginLeft: tab === 'json' ? -1.5 : 0, background: certTab === tab ? 'var(--ink)' : 'none', color: certTab === tab ? 'var(--bg)' : 'var(--mut)', font: '500 11px var(--mono)', cursor: 'pointer', minHeight: 36 }}>
                  {tab === 'summary' ? 'Summary' : 'Raw JSON'}
                </button>
              ))}
            </div>
          </div>
          <div role="tabpanel" id={`${certTabId}-panel`} aria-labelledby={`${certTabId}-tab-${certTab}`}>
            {certTab === 'summary' ? (
              <div>
                {SAMPLE_SUMMARY.map(([k, v]) => (
                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--soft)' }}>
                    <span style={{ font: '12px var(--mono)', color: 'var(--mut)' }}>{k}</span>
                    <span style={{ font: '12px var(--mono)', color: 'var(--ink)', wordBreak: 'break-all' }}>{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <pre style={{ margin: 0, padding: '14px', font: '11px/1.7 var(--mono)', color: 'var(--ink)', overflowX: 'auto' }}>{SAMPLE_JSON}</pre>
            )}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section id="capabilities" style={{ padding: `clamp(32px,5vw,72px) ${W}`, borderBottom: '2px solid var(--line)' }}>
        <SectionLabel label="Capabilities" id="capabilities" />
        <SectionH2>Available, in progress, and out-of-scope</SectionH2>
        <p style={{ font: '13px/1.6 var(--sans)', color: 'var(--mut)', maxWidth: '52ch', marginBottom: 24 }}>
          Expand each category to review operational coverage, upcoming engineering work, and explicit system boundaries.
        </p>
        <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CAPABILITIES.map((group: (typeof CAPABILITIES)[number]) => (
            <details
              key={group.status}
              style={{
                border: '2px solid var(--line)',
                background: 'var(--card)',
                padding: '12px 16px',
              }}
            >
              <summary
                style={{
                  font: '500 13px var(--mono)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  outline: 'none',
                  userSelect: 'none',
                }}
              >
                <span>{group.status}</span>
                <span
                  style={{
                    font: '500 10px var(--mono)',
                    border: `1px solid ${group.badge}`,
                    color: group.badge,
                    padding: '2px 8px',
                  }}
                >
                  {group.items.length} items
                </span>
              </summary>
              <div style={{ marginTop: 12, borderTop: '1px solid var(--soft)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.items.map((it: (typeof group.items)[number]) => (
                  <div key={it.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ font: '500 12px var(--sans)', color: 'var(--ink)' }}>{it.name}</div>
                    <div style={{ font: '11px/1.5 var(--mono)', color: 'var(--mut)' }}>{it.desc}</div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* G: DEMO CTA */}
      <section style={{ padding: `clamp(40px,6vw,96px) ${W}`, borderBottom: '2px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Assessment Demo</div>
          <h2 style={{ font: '400 clamp(26px,3.5vw,40px)/1.05 var(--ser)', letterSpacing: '-0.01em', marginBottom: 10 }}>
            See the full evidence panel<br />
            <em style={{ fontStyle: 'italic', color: 'var(--acc)' }}>before you commit to integration</em>
          </h2>
          <p style={{ font: '13px/1.6 var(--sans)', color: 'var(--mut)', maxWidth: '48ch' }}>
            The Assessment Demo runs the complete pipeline on your camera and shows every signal, score, and reason code.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, font: '11px var(--mono)', color: 'var(--wn)', border: '1px solid var(--wn)', padding: '3px 8px' }}>
            Demonstration, not a live integration
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" className="btn" onClick={onViewDemo} style={{ fontSize: 14, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }} id="landing-demo-cta-btn">
            <Eye size={14} /> Open Assessment Demo <ArrowRight size={14} />
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn ghost" onClick={() => onEnterPlatform('login')} style={{ fontSize: 13, flex: 1, whiteSpace: 'nowrap' }} id="landing-platform-login-btn">
              <Lock size={13} style={{ display: 'inline', marginRight: 4 }} /> Sign In
            </button>
            <button type="button" className="btn" onClick={() => onEnterPlatform('register')} style={{ fontSize: 13, flex: 1, whiteSpace: 'nowrap' }} id="landing-platform-register-btn">
              Create Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: `20px ${W}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ font: '400 16px var(--ser)', display: 'flex', alignItems: 'baseline', gap: 6 }}>
          Argus <small style={{ font: '500 9px var(--mono)', color: 'var(--mut)', letterSpacing: '.08em' }}>PLATFORM</small>
        </div>
        <div style={{ font: '11px var(--mono)', color: 'var(--mut)' }}>SGP 2026 - Human Verification Research Platform</div>
      </footer>

      <style>{`
        @media (max-width: 860px) {
          .landing-pipe-strip   { grid-template-columns: repeat(3,1fr) !important; }
          .landing-sig-grid     { grid-template-columns: 1fr !important; }
          .landing-sig-grid > :nth-child(2)    { margin-left: 0 !important; margin-top: -2px; }
          .landing-limits-grid  { grid-template-columns: 1fr !important; }
          .landing-limits-grid > :nth-child(2) { margin-left: 0 !important; margin-top: -2px; }
        }
        @media (max-width: 480px) {
          .landing-pipe-strip { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
};
