import React from 'react';

const FULL_ARCHITECTURE_CHAIN = [
  {
    step: '01',
    title: 'React Client Portal',
    layer: 'Client Presentation & Sensor Ingress',
    description: 'Acquires browser camera stream via MediaDevices API. Performs real-time facial ROI tracking and client-side rPPG preview. Dispatches encrypted telemetry without local scoring authority.',
  },
  {
    step: '02',
    title: 'REST API & Security',
    layer: 'Spring Boot 3.4 & Spring Security',
    description: 'Enforces JWT authentication, role-based access control (USER / ADMIN / SUPERADMIN / AUDIT), rate limiting, and request payload schema validation.',
  },
  {
    step: '03',
    title: 'Verification Orchestrator',
    layer: 'Core Business Logic Service',
    description: 'Coordinates the verification lifecycle state machine (INITIATED → IN_PROGRESS → COMPLETED/FAILED). Aggregates signals across concurrent computational subsystems.',
  },
  {
    step: '04',
    title: 'Multi-Modal Signal Engines',
    layer: 'Biometric & ML Evaluation',
    description: 'Parallel analysis across 5 signals: (a) rPPG micro-vascular blood volume pulse; (b) 3D head pose & blink dynamics; (c) Dynamic challenge validation; (d) ONNX MiniFASNetV2-SE presentation attack detection; (e) Bayesian confidence reasoning.',
  },
  {
    step: '05',
    title: 'Decision & Risk Policy',
    layer: 'Policy Enforcement Gate',
    description: 'Fuses multi-modal scores against active organizational policy thresholds. Generates authoritative verdict: PASS (confidence ≥ 0.80), FAIL (anti-spoof attack or failed challenge), or UNCERTAIN.',
  },
  {
    step: '06',
    title: 'PostgreSQL Store',
    layer: 'Relational Ledger & Audit',
    description: 'Persists verification states, component score vectors, and relational audit logs with timestamped actors, client IP addresses, and resource IDs.',
  },
  {
    step: '07',
    title: 'Cloud KMS Attestation',
    layer: 'Cryptographic Trust Authority',
    description: 'Signs verification hashes with asymmetric hardware-protected private keys (ECDSA SHA-256). Issues verifiable records for authenticated session review.',
  },
];

export const ArchitectureView: React.FC = () => {
  return (
    <section className="view-content" id="ar">
      <div className="eyebrow">06 · Technical Architecture</div>
      <h1 className="view-title">
        From camera to <i>cryptographic attestation.</i>
      </h1>
      <p className="lede">
        The complete 7-stage architectural chain powering Argus. Designed for Google Solution Challenge 2026, faculty review, and security auditability.
      </p>

      {/* 7-Step Full Architecture Chain */}
      <div className="space-y-3">
        {FULL_ARCHITECTURE_CHAIN.map((item) => (
          <div key={item.step} className="box-card pad flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-3 md:w-48 shrink-0">
              <span className="text-xl font-bold font-mono text-[var(--acc)]">
                {item.step}
              </span>
              <div>
                <h3 style={{ font: '400 20px var(--ser)', margin: 0 }}>{item.title}</h3>
                <span className="text-[10px] font-mono text-[var(--mut)] uppercase tracking-wider block">
                  {item.layer}
                </span>
              </div>
            </div>
            <p className="text-xs text-[var(--ink)] font-mono leading-relaxed flex-1 border-t md:border-t-0 md:border-l border-[var(--soft)] pt-2 md:pt-0 md:pl-4">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {/* Faculty & Engineering Callout Cards */}
      <div className="g g2 mt-6">
        <div className="box-card pad">
          <div className="stat-label">Architectural Principle: Not Blockchain</div>
          <p className="text-xs text-[var(--ink)] mt-2 leading-relaxed">
            Trust is derived from asymmetric public-key cryptography and Google Cloud KMS hardware security modules (HSMs). Unlike blockchain solutions, Argus eliminates proof-of-work energy waste, high transaction latencies, and public ledger leakage while delivering tamper-evident verification records.
          </p>
        </div>

        <div className="box-card pad">
          <div className="stat-label">Privacy &amp; Data Flow Reality</div>
          <p className="text-xs text-[var(--ink)] mt-2 leading-relaxed">
            Continuous webcam video is never written to disk or stored. During verification completion, a single 320×240 snapshot is transmitted over TLS for transient in-memory presentation attack analysis and is not stored in PostgreSQL. Only derived scalar scores, audit logs, and cryptographic records are retained.
          </p>
        </div>
      </div>
    </section>
  );
};
