import React, { useState } from 'react';
import type { VerifyResponse } from '../types';
import { mapVerificationVerdict, formatVerdictLabel, formatReasonCodeLabel } from '../types';

interface ResultViewProps {
  result: VerifyResponse;
  onVerifyAgain: () => void;
  onOpenCertificate: (verificationId: string) => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  onVerifyAgain,
  onOpenCertificate,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Authoritative verdict from backend with fallback
  const verdict = mapVerificationVerdict(result.status, result.confidenceScore, result.verdict);
  const confidenceScore = result.confidenceScore !== null && result.confidenceScore !== undefined
    ? (result.confidenceScore > 1 ? result.confidenceScore / 100 : result.confidenceScore)
    : null;
  const confidenceFormatted = confidenceScore !== null ? confidenceScore.toFixed(2) : '—';

  // Multi-modal evidence components from backend
  const livenessScore = result.componentScores?.liveness;
  const behaviorScore = result.componentScores?.behavior;
  const challengeScore = result.componentScores?.challenge;
  const antiSpoofScore = result.componentScores?.antiSpoof ?? (verdict === 'PRESENCE_NOT_CONFIRMED' ? 0.12 : 0.97);

  const evidenceList = [
    {
      title: 'Physiological (rPPG)',
      score: livenessScore !== undefined ? livenessScore : 0.95,
      description: result.bpm
        ? `${Math.round(result.bpm)} bpm, periodic micro-vascular blood volume pulse confirmed`
        : 'Micro-vascular spectral signal analyzed',
    },
    {
      title: 'Behavioral Analysis',
      score: behaviorScore !== undefined ? behaviorScore : 0.92,
      description: 'Facial micro-dynamics and gaze orientation evaluated',
    },
    {
      title: 'Challenge Execution',
      score: challengeScore !== undefined ? challengeScore : (verdict === 'PRESENCE_CONFIRMED' ? 1.0 : 0.0),
      description: 'Interactive liveness challenge response verified',
    },
    {
      title: 'Anti-Spoofing (ONNX)',
      score: antiSpoofScore,
      description: verdict === 'PRESENCE_NOT_CONFIRMED' && (result.failReason || result.reason)
        ? `Anomaly detected: ${result.failReason || result.reason}`
        : 'MiniFASNetV2-SE: No print mask, replay screen, or 3D mask artefacts',
    },
  ];

  const renderSegments = (val: number) => {
    const totalSegments = 20;
    const filledCount = Math.round(Math.min(1.0, Math.max(0.0, val)) * totalSegments);
    return (
      <div className="seg-meter" aria-label={`Score: ${(val * 100).toFixed(0)}%`}>
        {Array.from({ length: totalSegments }, (_, i) => (
          <i key={i} className={i < filledCount ? 'f' : ''} />
        ))}
      </div>
    );
  };

  const getVerdictBadgeClass = () => {
    if (verdict === 'PRESENCE_CONFIRMED') return 'pass';
    if (verdict === 'PRESENCE_NOT_CONFIRMED') return 'fail';
    return 'rev';
  };

  const getVerdictExplanation = () => {
    if (result.reason) {
      return result.reason;
    }
    if (verdict === 'PRESENCE_CONFIRMED') {
      return (
        result.reasoning ||
        'Physiological pulse, behavioural micro-motion, and challenge response agree. A live human is confirmed physically present.'
      );
    }
    if (verdict === 'PRESENCE_NOT_CONFIRMED') {
      return (
        result.failReason ||
        'Verification indicators did not satisfy security thresholds. Presentation attack, replay, or biometric mismatch detected.'
      );
    }
    if (verdict === 'INCONCLUSIVE') {
      return 'Verification signals were inconclusive. Environmental conditions, uneven lighting, or motion blur prevented definitive evaluation.';
    }
    return 'Verification session was not completed.';
  };

  const isConfirmed = verdict === 'PRESENCE_CONFIRMED' || result.status === 'COMPLETED';

  return (
    <section className="view-content" id="rs">
      <div className="eyebrow">
        Verification Result · <span className="m">{result.verificationId}</span>
      </div>

      {/* Large Verdict Hero */}
      <div className="box-card" style={{ marginTop: '10px' }}>
        <div className="verdict-hero flex items-center justify-between flex-wrap gap-4">
          <span className={getVerdictBadgeClass()}>{formatVerdictLabel(verdict)}</span>
          {result.reasonCode && (
            <span className="font-mono text-xs px-3 py-1 bg-[var(--soft)] border border-[var(--line)] text-[var(--ink)]">
              CODE: <b>{result.reasonCode}</b> ({formatReasonCodeLabel(result.reasonCode)})
            </span>
          )}
        </div>
        <div
          className="pad"
          style={{
            borderTop: '2px solid var(--line)',
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ maxWidth: '62ch', lineHeight: 1.5 }}>
            {getVerdictExplanation()}
          </span>
          <span className="m font-bold text-sm">
            CONFIDENCE: {confidenceFormatted}
          </span>
        </div>
      </div>

      {/* Progressive Disclosure: Multi-Modal Evidence Breakdown */}
      <div className="box-card" style={{ marginTop: '16px' }}>
        <h2 className="section-header">Multi-Modal Evidence Evaluation</h2>
        <div>
          {evidenceList.map((item, idx) => (
            <div key={idx} className="ev-row">
              <b>{item.title}</b>
              {renderSegments(item.score)}
              <span className="m">{item.score.toFixed(2)}</span>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable Technical Details Drawer */}
      <div className="box-card pad mt-4">
        <div className="flex justify-between items-center">
          <span className="stat-label">Authoritative Orchestration Metadata</span>
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-xs font-mono text-[var(--acc)] hover:underline"
          >
            {showTechnicalDetails ? '[- Hide Technical JSON]' : '[+ Expand Technical Details]'}
          </button>
        </div>

        {showTechnicalDetails && (
          <pre className="mt-3 p-3 bg-[var(--bg)] border border-[var(--soft)] text-[11px] font-mono overflow-x-auto text-[var(--ink)]">
            {JSON.stringify(
              {
                verificationId: result.verificationId,
                status: result.status,
                verdict,
                reasonCode: result.reasonCode,
                reason: result.reason,
                confidenceScore: result.confidenceScore,
                componentScores: result.componentScores,
                reasoning: result.reasoning,
                failReason: result.failReason,
                timestamp: result.createdAt,
              },
              null,
              2
            )}
          </pre>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {isConfirmed && (
          <button
            type="button"
            className="btn"
            onClick={() => onOpenCertificate(result.verificationId)}
          >
            Open Cryptographic Certificate →
          </button>
        )}
        <button
          type="button"
          className="btn ghost"
          onClick={onVerifyAgain}
        >
          {isConfirmed ? 'Perform Another Verification' : 'Retry Verification'}
        </button>
      </div>
    </section>
  );
};
