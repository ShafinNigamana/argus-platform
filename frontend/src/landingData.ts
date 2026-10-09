// Argus Landing Page Interactive Models & Capability Taxonomy
// Pure domain types and illustrative calculators

export interface SignalItem {
  id: string;
  label: string;
  contribution: number;
}

export const SIGNALS: SignalItem[] = [
  { id: 'pulse', label: 'Pulse signal', contribution: 0.38 },
  { id: 'challenge', label: 'Reflex challenge', contribution: 0.33 },
  { id: 'spoof', label: 'Spoof check', contribution: 0.29 },
];

export function illustrativeConf(enabled: Set<string>): number {
  const total = SIGNALS.reduce((s, sg) => s + sg.contribution, 0);
  const active = SIGNALS.filter((sg) => enabled.has(sg.id)).reduce((s, sg) => s + sg.contribution, 0);
  return total > 0 ? active / total : 0;
}

export function illustrativeVerdict(conf: number): { label: string; ok: boolean } {
  if (conf >= 0.8) return { label: 'PRESENCE_CONFIRMED', ok: true };
  if (conf >= 0.5) return { label: 'INCONCLUSIVE', ok: false };
  return { label: 'PRESENCE_NOT_CONFIRMED', ok: false };
}

export const CAPABILITIES = [
  {
    status: 'Available',
    badge: 'var(--ok)',
    items: [
      { name: 'Multi-signal presence verification', desc: 'Combines rPPG pulse, challenge-response, and ONNX anti-spoofing in a single session.' },
      { name: 'UltraFace face localization', desc: 'Slim 320 ONNX model detects single face; rejects multi-face scenes immediately.' },
      { name: 'MiniFASNetV2-SE spoof detection', desc: 'Classifies presentation attacks (printed photograph and screen replay).' },
      { name: 'Cryptographic attestation', desc: 'Asymmetric KMS signature or SHA-256 fallback hash with verification certificate.' },
      { name: 'Backend-authoritative decision engine', desc: 'Fixed scoring weights, explainable reason codes, and owner-scoped audit log.' },
    ],
  },
  {
    status: 'In progress',
    badge: 'var(--wn)',
    items: [
      { name: 'Hardware security module (HSM) signing', desc: 'Direct HSM integration for FIPS 140-2 Level 3 certificate signing keys.' },
      { name: 'Adaptive illumination compensation', desc: 'Dynamic white-balance normalization for extreme low-light client environments.' },
      { name: 'Low-latency multi-region verification', desc: 'Edge session orchestration for sub-second verification turnaround.' },
    ],
  },
  {
    status: 'Not provided',
    badge: 'var(--bad)',
    items: [
      { name: 'Identity verification / KYC', desc: 'Argus does not identify the human or parse government documents. Pair with a KYC provider.' },
      { name: 'Biometric template storage', desc: 'No facial embeddings, recognition templates, or face galleries are created or stored.' },
      { name: 'Continuous proctoring', desc: 'Argus evaluates a single point-in-time presence event, not a persistent session stream.' },
      { name: 'Public unauthenticated certificate lookup', desc: 'Verification records are owner- and operator-scoped; no public unauthenticated directory.' },
    ],
  },
];
