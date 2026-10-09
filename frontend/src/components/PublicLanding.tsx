import React, { useState } from 'react';
import {
  Activity,
  Eye,
  Key,
  ShieldCheck,
  Clock,
  Lock,
  FileCheck2,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface PublicLandingProps {
  onEnterPlatform: () => void;
  onViewDemo: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data — all claims verified against VerificationStudio.tsx + types.ts
// ─────────────────────────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  {
    num: '01',
    title: 'Camera Acquisition',
    body: 'Browser MediaDevices API captures a live camera stream. No video is stored—only transient frame data is used during the session.',
    tag: 'CLIENT-SIDE',
  },
  {
    num: '02',
    title: 'rPPG Signal Extraction',
    body: 'The green optical channel (520–560 nm) is sampled to detect microscopic capillary expansion from cardiac cycles—a genuine physiological liveness signal.',
    tag: 'CLIENT-SIDE',
  },
  {
    num: '03',
    title: 'Face Detection & Anti-Spoofing',
    body: 'UltraFace Slim 320 locates the face. MiniFASNetV2-SE (ONNX) classifies it as live or a presentation attack. Multiple faces cause immediate rejection.',
    tag: 'SERVER-SIDE ONNX',
  },
  {
    num: '04',
    title: 'Head-Pose & Reflex Challenges',
    body: 'Randomised challenges (blink, head-left, head-right, hold-still) with millisecond-bounded evaluation. Defeats static images, video loops, and injection attacks.',
    tag: 'SERVER-SIDE',
  },
  {
    num: '05',
    title: 'Backend Decision Engine',
    body: 'Component scores from each signal are fused by the backend. The authoritative verdict—PRESENCE_CONFIRMED, PRESENCE_NOT_CONFIRMED, or INCONCLUSIVE—is returned.',
    tag: 'AUTHORITATIVE',
  },
  {
    num: '06',
    title: 'Signed Verification Record',
    body: 'A canonical JSON attestation is produced and signed via Google Cloud KMS (asymmetric) or SHA-256 integrity hash (fallback). Scalar scores persist; no image or video is stored.',
    tag: 'CRYPTOGRAPHIC',
  },
] as const;

const CAPABILITIES = [
  {
    icon: Activity,
    label: 'SIGNAL 01 · PHYSIOLOGICAL',
    title: 'rPPG Pulse Extraction',
    body: 'Microscopic volumetric skin capillary expansion sampled from the green optical spectrum (520–560 nm). Detects genuine cardiac cycles without wearable hardware.',
    footer: 'Spectrum: 520–560 nm',
    accentVar: '--acc',
  },
  {
    icon: Eye,
    label: 'SIGNAL 02 · BEHAVIORAL',
    title: 'Dynamic Reflex Challenges',
    body: 'Randomised, millisecond-bounded instructions (blink, head-pose, hold-still). Each challenge response is evaluated server-side; pre-recorded loops cannot satisfy a fresh nonce.',
    footer: 'New nonce per session',
    accentVar: '--ok',
  },
  {
    icon: Key,
    label: 'SIGNAL 03 · CRYPTOGRAPHIC',
    title: 'Signed Attestation Record',
    body: 'Every completed verification produces a canonical JSON record signed by Google Cloud KMS (asymmetric key) or SHA-256 integrity hash in fallback mode. Downstream systems can verify the signature independently.',
    footer: 'KMS asymmetric / SHA-256',
    accentVar: '--wn',
  },
] as const;

const HONEST_LIMITS = [
  {
    label: 'What Argus IS',
    items: [
      'A point-in-time human presence evaluation',
      'A multi-signal liveness assessment (physiological + behavioral + ONNX)',
      'A cryptographically signed verification record',
      'An operator-configurable confidence threshold system',
    ],
    accent: 'ok',
  },
  {
    label: 'What Argus is NOT',
    items: [
      'An identity / KYC provider — it does not verify who you are',
      'A face-recognition system — no biometric template is stored',
      'A deepfake detector — it evaluates presence, not media authenticity',
      'Continuous proctoring — it evaluates a single point-in-time event',
      'Guaranteed fraud prevention — a determined, capable adversary is not ruled out',
    ],
    accent: 'bad',
  },
] as const;

const FAQ_ITEMS = [
  {
    q: 'Does Argus store my video or image?',
    a: 'No. A single snapshot is transiently processed server-side by the ONNX pipeline and then discarded. Only scalar scores and verification metadata are persisted in the database.',
  },
  {
    q: 'What is the "confidence score"?',
    a: 'A dimensionless number between 0.0 and 1.0 produced by the backend decision engine by fusing component scores from rPPG, behavioral challenges, and the ONNX anti-spoofing model. The operator configures the threshold (default 80%) above which a verdict of PRESENCE_CONFIRMED is issued.',
  },
  {
    q: 'What is the difference between KMS-signed and SHA-256?',
    a: 'KMS asymmetric mode uses a Google Cloud KMS key to produce a true cryptographic signature that a third party can verify against the public key. SHA-256 fallback mode produces an integrity hash only—it confirms the record has not been tampered with but does not prove origin.',
  },
  {
    q: 'Can I use Argus as a KYC or identity layer?',
    a: 'No. Argus only evaluates whether a live human was present at the moment of verification. It does not verify who that person is. You must pair it with a separate identity/KYC provider for full assurance.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const SectionEyebrow: React.FC<{ id?: string; label: string }> = ({ id, label }) => (
  <div
    id={id}
    style={{
      font: '500 11px var(--mono)',
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      color: 'var(--mut)',
      marginBottom: 12,
    }}
  >
    {label}
  </div>
);

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--soft)' }}>
      <button
        type="button"
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '16px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          textAlign: 'left',
          font: '500 14px var(--sans)',
          color: 'var(--ink)',
        }}
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
      >
        {q}
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            color: 'var(--mut)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .15s ease',
          }}
        />
      </button>
      {open && (
        <p
          style={{
            font: '13px/1.6 var(--sans)',
            color: 'var(--mut)',
            paddingBottom: 16,
            marginTop: -4,
          }}
        >
          {a}
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export const PublicLanding: React.FC<PublicLandingProps> = ({ onEnterPlatform, onViewDemo }) => {
  const W = 'clamp(20px, 5vw, 64px)';

  return (
    <div
      style={{
        background: 'var(--bg)',
        color: 'var(--ink)',
        minHeight: '100vh',
        fontFamily: 'var(--sans)',
      }}
    >
      {/* ── Sticky header nav ──────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: '2px solid var(--line)',
          background: 'var(--bg)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${W}`,
          height: 56,
        }}
      >
        <div
          style={{
            font: '400 26px var(--ser)',
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          Argus
          <small
            style={{
              font: '500 10px var(--mono)',
              color: 'var(--mut)',
              letterSpacing: '.08em',
            }}
          >
            PLATFORM
          </small>
        </div>

        <nav
          style={{
            display: 'flex',
            gap: 0,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {['How It Works', 'Privacy', 'Limits'].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
              style={{
                font: '500 12px var(--mono)',
                color: 'var(--mut)',
                textDecoration: 'none',
                padding: '0 16px',
                lineHeight: '54px',
              }}
            >
              {label}
            </a>
          ))}
          <button
            type="button"
            className="btn"
            onClick={onEnterPlatform}
            style={{ marginLeft: 16, padding: '8px 18px', fontSize: 12 }}
            id="landing-header-enter-btn"
          >
            Enter Platform
          </button>
        </nav>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          §1 · HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        style={{
          borderBottom: '2px solid var(--line)',
          padding: `clamp(48px, 8vw, 120px) ${W} clamp(40px, 6vw, 96px)`,
        }}
      >
        {/* Headline block */}
        <div style={{ maxWidth: 820, marginBottom: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Human Verification Platform · SGP 2026
          </div>
          <h1
            style={{
              font: '400 clamp(44px, 7vw, 96px)/0.95 var(--ser)',
              letterSpacing: '-0.02em',
              marginBottom: 28,
            }}
          >
            Is a live human<br />
            present{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--acc)' }}>right now?</em>
          </h1>
          <p
            style={{
              font: '15px/1.65 var(--sans)',
              color: 'var(--mut)',
              maxWidth: '58ch',
              marginBottom: 36,
            }}
          >
            Argus evaluates whether sufficient evidence exists that a live human was physically
            present during a specific verification event—combining physiological, behavioral, and
            cryptographic signals instead of relying on face detection alone.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn"
              onClick={onEnterPlatform}
              style={{ fontSize: 14 }}
              id="landing-hero-enter-btn"
            >
              <Lock size={14} />
              Enter Platform
              <ArrowRight size={14} />
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

        {/* Pipeline status card */}
        <div className="box-card" style={{ maxWidth: 780, overflow: 'hidden' }}>
          <div
            style={{
              font: '500 10px var(--mono)',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--mut)',
              padding: '10px 14px',
              borderBottom: '2px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>VERIFICATION PIPELINE STATUS</span>
            <span style={{ color: 'var(--ok)' }}>● ALL SYSTEMS OPERATIONAL</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
            }}
          >
            {[
              { label: 'rPPG Pulse Sensor', detail: '520–560 nm green channel', status: 'ACTIVE' },
              { label: 'UltraFace Detection', detail: 'ONNX · Slim 320', status: 'ACTIVE' },
              { label: 'Anti-Spoofing Model', detail: 'MiniFASNetV2-SE', status: 'ACTIVE' },
              { label: 'Challenge Engine', detail: 'Blink · Head-pose · Hold', status: 'ACTIVE' },
              { label: 'Decision Backend', detail: 'Threshold gating', status: 'ACTIVE' },
              { label: 'KMS Signing', detail: 'Asymmetric / SHA-256', status: 'ACTIVE' },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 14px',
                  borderBottom: i < 3 ? '1px solid var(--soft)' : 'none',
                  borderRight: i % 3 !== 2 ? '1px solid var(--soft)' : 'none',
                }}
              >
                <div
                  style={{
                    font: '500 13px var(--sans)',
                    marginBottom: 2,
                  }}
                >
                  {row.label}
                </div>
                <div
                  style={{
                    font: '11px var(--mono)',
                    color: 'var(--mut)',
                  }}
                >
                  {row.detail}
                </div>
                <div
                  style={{
                    font: '10px var(--mono)',
                    color: 'var(--ok)',
                    marginTop: 4,
                    letterSpacing: '.05em',
                  }}
                >
                  {row.status}
                </div>
              </div>
            ))}
          </div>

          {/* Honest stats footer */}
          <div
            style={{
              padding: '14px',
              borderTop: '2px solid var(--line)',
              background: 'var(--bg)',
              display: 'flex',
              gap: 40,
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Default Confidence Threshold', val: '80%', note: 'operator-configurable' },
              { label: 'Signals Fused', val: '3×', note: 'physiological · behavioral · cryptographic' },
              { label: 'Storage', val: '0 bytes', note: 'of video or raw image' },
            ].map(({ label, val, note }) => (
              <div key={label}>
                <div className="stat-label">{label}</div>
                <div
                  style={{
                    font: '400 32px/1 var(--ser)',
                    margin: '4px 0 2px',
                  }}
                >
                  {val}
                </div>
                <div
                  style={{
                    font: '11px var(--mono)',
                    color: 'var(--mut)',
                  }}
                >
                  {note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §2 · CAPABILITIES
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: `clamp(40px, 6vw, 96px) ${W}`,
          borderBottom: '2px solid var(--line)',
        }}
      >
        <SectionEyebrow label="Three Verification Signals" />
        <h2
          style={{
            font: '400 clamp(28px, 4vw, 48px)/1 var(--ser)',
            marginBottom: 8,
            letterSpacing: '-0.01em',
          }}
        >
          Multi-modal liveness architecture
        </h2>
        <p
          style={{
            font: '14px/1.6 var(--sans)',
            color: 'var(--mut)',
            maxWidth: '56ch',
            marginBottom: 40,
          }}
        >
          Three independent layers—physiological, behavioral, and cryptographic—are each evaluated
          server-side and fused into a single authoritative verdict by the backend decision engine.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
          }}
        >
          {CAPABILITIES.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <div
                key={i}
                className="box-card"
                style={{
                  padding: 24,
                  marginLeft: i === 0 ? 0 : -2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      font: '500 10px var(--mono)',
                      letterSpacing: '.1em',
                      color: 'var(--mut)',
                      marginBottom: 10,
                    }}
                  >
                    {cap.label}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <Icon size={18} style={{ color: `var(${cap.accentVar})`, flexShrink: 0 }} />
                    <h3 style={{ font: '400 22px var(--ser)' }}>{cap.title}</h3>
                  </div>
                  <p
                    style={{
                      font: '13px/1.6 var(--sans)',
                      color: 'var(--mut)',
                    }}
                  >
                    {cap.body}
                  </p>
                </div>
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 12,
                    borderTop: '1px solid var(--soft)',
                    font: '11px var(--mono)',
                    color: 'var(--mut)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{cap.footer}</span>
                  <span style={{ color: `var(${cap.accentVar})` }}>●</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §3 · HOW IT WORKS
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        style={{
          padding: `clamp(40px, 6vw, 96px) ${W}`,
          borderBottom: '2px solid var(--line)',
        }}
      >
        <SectionEyebrow label="Verification Pipeline" />
        <h2
          style={{
            font: '400 clamp(28px, 4vw, 48px)/1 var(--ser)',
            marginBottom: 8,
            letterSpacing: '-0.01em',
          }}
        >
          Six stages from camera to certificate
        </h2>
        <p
          style={{
            font: '14px/1.6 var(--sans)',
            color: 'var(--mut)',
            maxWidth: '56ch',
            marginBottom: 48,
          }}
        >
          Every verification passes through an identical, non-skippable sequence. Each stage
          produces evidence handed to the next; no stage can be short-circuited.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
          }}
        >
          {PIPELINE_STEPS.map((step, i) => (
            <div
              key={i}
              className="box-card"
              style={{
                padding: '20px 20px 24px',
                marginLeft: i % 3 === 0 ? 0 : -2,
                marginTop: i < 3 ? 0 : -2,
                position: 'relative',
              }}
            >
              <div
                style={{
                  font: '400 56px/1 var(--ser)',
                  color: 'var(--soft)',
                  position: 'absolute',
                  right: 16,
                  top: 12,
                  letterSpacing: '-0.02em',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                {step.num}
              </div>
              <div
                style={{
                  font: '500 10px var(--mono)',
                  color: 'var(--acc)',
                  letterSpacing: '.08em',
                  marginBottom: 6,
                }}
              >
                {step.tag}
              </div>
              <h3
                style={{
                  font: '400 20px var(--ser)',
                  marginBottom: 10,
                  paddingRight: 40,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  font: '13px/1.6 var(--sans)',
                  color: 'var(--mut)',
                }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §4 · PRIVACY
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="privacy"
        style={{
          padding: `clamp(40px, 6vw, 96px) ${W}`,
          borderBottom: '2px solid var(--line)',
        }}
      >
        <SectionEyebrow label="Privacy Architecture" />
        <h2
          style={{
            font: '400 clamp(28px, 4vw, 48px)/1 var(--ser)',
            marginBottom: 8,
            letterSpacing: '-0.01em',
          }}
        >
          Designed to discard, not collect
        </h2>
        <p
          style={{
            font: '14px/1.6 var(--sans)',
            color: 'var(--mut)',
            maxWidth: '56ch',
            marginBottom: 40,
          }}
        >
          The backend receives a single snapshot per verification session, processes it through the
          ONNX pipeline, and discards it. Only scalar scores and metadata are written to the database.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
          }}
        >
          {/* What IS stored */}
          <div className="box-card" style={{ padding: 28 }}>
            <div
              style={{
                font: '500 10px var(--mono)',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: 'var(--ok)',
                marginBottom: 14,
              }}
            >
              WHAT IS STORED
            </div>
            {[
              ['Verification ID', 'UUID per event'],
              ['Confidence Score', 'Single float 0.0–1.0'],
              ['Component Scores', '3 scalar values'],
              ['Verdict', 'PRESENCE_CONFIRMED / NOT_CONFIRMED / INCONCLUSIVE'],
              ['Reason Code', 'Machine-readable string'],
              ['Timestamp', 'ISO-8601 UTC'],
              ['Signed Certificate', 'Canonical JSON + signature'],
            ].map(([key, val]) => (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr',
                  gap: 10,
                  padding: '9px 0',
                  borderBottom: '1px solid var(--soft)',
                }}
              >
                <span
                  style={{
                    font: '12px var(--mono)',
                    color: 'var(--ink)',
                    fontWeight: 500,
                  }}
                >
                  {key}
                </span>
                <span style={{ font: '12px var(--sans)', color: 'var(--mut)' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* What is NOT stored */}
          <div className="box-card" style={{ padding: 28, marginLeft: -2 }}>
            <div
              style={{
                font: '500 10px var(--mono)',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: 'var(--bad)',
                marginBottom: 14,
              }}
            >
              WHAT IS NOT STORED
            </div>
            {[
              ['Video footage', 'No recording of any kind is retained'],
              ['Raw image frames', 'Transiently processed, then discarded'],
              ['Biometric template', 'No face embedding is ever written to disk'],
              ['Identity document', 'Argus is not an identity or KYC system'],
              ['Camera device ID', 'Never sent to the backend'],
            ].map(([key, val]) => (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr',
                  gap: 10,
                  padding: '9px 0',
                  borderBottom: '1px solid var(--soft)',
                }}
              >
                <span
                  style={{
                    font: '12px var(--mono)',
                    color: 'var(--ink)',
                    fontWeight: 500,
                  }}
                >
                  {key}
                </span>
                <span style={{ font: '12px var(--sans)', color: 'var(--mut)' }}>{val}</span>
              </div>
            ))}

            <div
              className="box-card"
              style={{
                marginTop: 24,
                padding: '14px 16px',
                background: 'var(--bg)',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <ShieldCheck
                size={16}
                style={{ color: 'var(--ok)', flexShrink: 0, marginTop: 1 }}
              />
              <p style={{ font: '12px/1.6 var(--sans)', color: 'var(--mut)' }}>
                The KMS-signed certificate contains only scalar scores and metadata. It is not a
                biometric template and cannot be used to reconstruct or recognise a face.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §5 · HONEST LIMITS
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="limits"
        style={{
          padding: `clamp(40px, 6vw, 96px) ${W}`,
          borderBottom: '2px solid var(--line)',
        }}
      >
        <SectionEyebrow label="System Limits" />
        <h2
          style={{
            font: '400 clamp(28px, 4vw, 48px)/1 var(--ser)',
            marginBottom: 8,
            letterSpacing: '-0.01em',
          }}
        >
          Honest about what Argus is—and is not
        </h2>
        <p
          style={{
            font: '14px/1.6 var(--sans)',
            color: 'var(--mut)',
            maxWidth: '56ch',
            marginBottom: 40,
          }}
        >
          Accurate scope documentation lets you decide whether Argus is the right tool for your
          specific use-case before you integrate.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {HONEST_LIMITS.map((col, i) => (
            <div
              key={i}
              className="box-card"
              style={{ padding: 28, marginLeft: i === 0 ? 0 : -2 }}
            >
              <div
                style={{
                  font: '500 10px var(--mono)',
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: `var(--${col.accent})`,
                  marginBottom: 16,
                }}
              >
                {col.label}
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {col.items.map((item, j) => (
                  <li
                    key={j}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      font: '13px/1.5 var(--sans)',
                      color: 'var(--ink)',
                    }}
                  >
                    <span
                      style={{
                        font: '500 11px var(--mono)',
                        color: `var(--${col.accent})`,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {col.accent === 'ok' ? '✓' : '✗'}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §6 · FAQ
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: `clamp(40px, 6vw, 96px) ${W}`,
          borderBottom: '2px solid var(--line)',
        }}
      >
        <SectionEyebrow label="Frequently Asked Questions" />
        <h2
          style={{
            font: '400 clamp(28px, 4vw, 48px)/1 var(--ser)',
            marginBottom: 8,
            letterSpacing: '-0.01em',
          }}
        >
          Technical questions answered honestly
        </h2>
        <div style={{ maxWidth: 720, marginTop: 32 }}>
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §7 · CTA BANNER
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: `clamp(48px, 7vw, 112px) ${W}`,
          borderBottom: '2px solid var(--line)',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 32,
          alignItems: 'center',
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Assessment Demo
          </div>
          <h2
            style={{
              font: '400 clamp(28px, 4vw, 44px)/1.05 var(--ser)',
              letterSpacing: '-0.01em',
              marginBottom: 12,
            }}
          >
            See the full evidence panel
            <br />
            <em style={{ fontStyle: 'italic', color: 'var(--acc)' }}>
              before you commit to integration
            </em>
          </h2>
          <p
            style={{
              font: '14px/1.6 var(--sans)',
              color: 'var(--mut)',
              maxWidth: '52ch',
            }}
          >
            The Assessment Demo runs the complete evaluation pipeline on your camera and displays
            every evidence signal, component score, and reason code—exactly as they appear in a
            production verification event.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={onViewDemo}
            style={{ fontSize: 14, whiteSpace: 'nowrap' }}
            id="landing-demo-cta-btn"
          >
            <Eye size={14} />
            Open Assessment Demo
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={onEnterPlatform}
            style={{ fontSize: 14, whiteSpace: 'nowrap' }}
            id="landing-platform-cta-btn"
          >
            <Lock size={14} />
            Sign In to Platform
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          §8 · FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer
        style={{
          padding: `24px ${W}`,
          borderTop: '1px solid var(--soft)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ font: '400 18px var(--ser)' }}>Argus</span>
          <span
            style={{
              font: '500 9px var(--mono)',
              color: 'var(--mut)',
              letterSpacing: '.08em',
            }}
          >
            PLATFORM
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {[
            { label: 'Verification Records', icon: FileCheck2 },
            { label: 'Trust & Privacy', icon: ShieldCheck },
            { label: 'Sessions Ledger', icon: Clock },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={onEnterPlatform}
              style={{
                background: 'none',
                border: 'none',
                font: '11px var(--mono)',
                color: 'var(--mut)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: 0,
              }}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>

        <div style={{ font: '11px var(--mono)', color: 'var(--mut)' }}>
          SGP 2026 · Human Verification Research Platform
        </div>
      </footer>
    </div>
  );
};
