// Argus Verification Simulation & Landing Page Interactive Models
// Pure domain types, simulation state machines, and illustrative calculators

export type SimScenario = 'live' | 'print' | 'screen';

export interface SimOutcome {
  verdict: 'PASS' | 'REJECTED';
  label: string;
  reason: string;
}

export interface SimStage {
  idx: number;
  id: string;
  label: string;
  durationMs: number;
  getStatus: (scenario: SimScenario, stageIdx: number) => 'pending' | 'active' | 'done' | 'failed';
}

export const SIM_SCENARIOS: Record<SimScenario, { label: string; description: string; outcome: SimOutcome }> = {
  live: {
    label: 'Live person',
    description: 'Subject is physically present. All signals pass.',
    outcome: {
      verdict: 'PASS',
      label: 'Presence confirmed',
      reason: 'Physiological pulse, challenge response, and spoof check all passed.',
    },
  },
  print: {
    label: 'Printed photo',
    description: 'A printed face photograph presented to the camera.',
    outcome: {
      verdict: 'REJECTED',
      label: 'Presence not confirmed',
      reason: 'Presentation attack detected — flat-texture artefacts indicate a printed medium. (MiniFASNetV2-SE)',
    },
  },
  screen: {
    label: 'Screen replay',
    description: 'A face video played back on a screen.',
    outcome: {
      verdict: 'REJECTED',
      label: 'Presence not confirmed',
      reason: 'Screen-pattern artefacts detected — pixel grid and moiré signature indicate a display medium. (MiniFASNetV2-SE)',
    },
  },
};

export const SIM_STAGES: SimStage[] = [
  {
    idx: 0,
    id: 'capture',
    label: 'Camera capture',
    durationMs: 1400,
    getStatus: (_, si) => (si > 0 ? 'done' : si === 0 ? 'active' : 'pending'),
  },
  {
    idx: 1,
    id: 'signal',
    label: 'Pulse signal',
    durationMs: 1800,
    getStatus: (_, si) => (si > 1 ? 'done' : si === 1 ? 'active' : 'pending'),
  },
  {
    idx: 2,
    id: 'challenge',
    label: 'Reflex challenge',
    durationMs: 1600,
    getStatus: (_, si) => (si > 2 ? 'done' : si === 2 ? 'active' : 'pending'),
  },
  {
    idx: 3,
    id: 'spoof',
    label: 'Spoof check (ONNX)',
    durationMs: 1400,
    getStatus: (scenario, si) => {
      if (si < 3) return 'pending';
      if (si === 3) return 'active';
      return scenario !== 'live' ? 'failed' : 'done';
    },
  },
  {
    idx: 4,
    id: 'fusion',
    label: 'Signal fusion',
    durationMs: 1200,
    getStatus: (scenario, si) => {
      if (si < 4) return 'pending';
      if (scenario !== 'live' && si >= 4) return 'pending';
      if (si === 4) return 'active';
      return 'done';
    },
  },
  {
    idx: 5,
    id: 'record',
    label: 'Signed record',
    durationMs: 1000,
    getStatus: (scenario, si) => {
      if (scenario !== 'live') return 'pending';
      if (si < 5) return 'pending';
      if (si === 5) return 'active';
      return 'done';
    },
  },
];

export const TERMINAL_STAGE: Record<SimScenario, number> = {
  live: 5,
  print: 3,
  screen: 3,
};

export function buildPulsePath(
  scenario: SimScenario,
  stageIdx: number,
  tick: number,
  W: number,
  H: number
): string {
  const mid = H / 2;
  const pts: [number, number][] = [];
  const count = 80;

  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * W;
    let y = mid;

    if (scenario === 'live' && stageIdx >= 1) {
      const phase = (i / count + tick * 0.004) * Math.PI * 2 * 1.2;
      const beat = Math.sin(phase) * 0.55 + Math.sin(phase * 2.1) * 0.18;
      const noise = Math.sin(i * 7.3 + tick) * 0.05;
      y = mid - (beat + noise) * (H * 0.36);
    } else if (scenario === 'print' && stageIdx >= 1) {
      const noise = Math.sin(i * 13 + tick * 0.2) * 0.04;
      y = mid + noise * H;
    } else if (scenario === 'screen' && stageIdx >= 1) {
      const phase = (i / count + tick * 0.003) * Math.PI * 2;
      y = mid - Math.sin(phase) * H * 0.26;
    }

    pts.push([x, y]);
  }

  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

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
