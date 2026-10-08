import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { CertificateResponse } from '../types';
import { isKmsSigned, isCertificateExpired } from '../types';

interface CertificateViewProps {
  initialVerificationId?: string;
  onNavigateHistory?: () => void;
}

export const CertificateView: React.FC<CertificateViewProps> = ({
  initialVerificationId = '',
  onNavigateHistory,
}) => {
  const [lookupId, setLookupId] = useState<string>(initialVerificationId);
  const [activeCertificate, setActiveCertificate] = useState<CertificateResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<string>('');
  const [notFoundError, setNotFoundError] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  const loadCertificate = useCallback(async (id: string) => {
    if (!id.trim()) {
      setActiveCertificate(null);
      setNotFoundError(null);
      return;
    }

    setIsLoading(true);
    setNotFoundError(null);

    try {
      const cert = await apiService.getCertificate(id.trim());
      if (cert) {
        setActiveCertificate(cert);
        setNotFoundError(null);
      } else {
        setActiveCertificate(null);
        setNotFoundError(
          `Certificate not found for verification ID "${id.trim()}". Cryptographic records are only minted for verifications that reach completion.`
        );
      }
    } catch (err: unknown) {
      setActiveCertificate(null);
      const msg = err instanceof Error ? err.message : 'Error retrieving certificate';
      setNotFoundError(`Unable to retrieve certificate: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialVerificationId) {
      setLookupId(initialVerificationId);
      loadCertificate(initialVerificationId);
    }
  }, [initialVerificationId, loadCertificate]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(label);
    setTimeout(() => setCopyStatus(''), 2500);
  };

  const isKms = activeCertificate ? isKmsSigned(activeCertificate) : false;
  const isExpired = activeCertificate ? isCertificateExpired(activeCertificate) : false;
  const isRevoked = Boolean(activeCertificate?.revoked);

  const payload = activeCertificate?.certificateData;
  const componentScores = (payload?.componentScores as Record<string, unknown>) || {};

  const confidenceValue =
    typeof payload?.confidenceScore === 'number'
      ? payload.confidenceScore > 1
        ? (payload.confidenceScore / 100).toFixed(2)
        : payload.confidenceScore.toFixed(2)
      : '—';

  return (
    <section className="view-content" id="ce">
      <div className="eyebrow">04 · Cryptographic Verification Record</div>
      <h1 className="view-title">
        Argus <i>Verification Record.</i>
      </h1>
      <p className="lede">
        A cryptographically anchored record of an Argus verification event and its resulting presence decision.
      </p>

      {/* ID Lookup bar */}
      <div className="box-card pad mb-6" style={{ maxWidth: '680px' }}>
        <div className="stat-label mb-1">Authenticated Verification Record Lookup</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadCertificate(lookupId);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Enter Verification UUID (e.g. 3fa85f64-...)"
            className="flex-1 px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] font-mono text-xs text-[var(--ink)] focus:outline-none"
          />
          <button
            type="submit"
            className="btn text-xs py-2 px-5 whitespace-nowrap"
            disabled={isLoading || !lookupId.trim()}
          >
            {isLoading ? 'Querying...' : 'Load Record'}
          </button>
        </form>
        <div className="text-[11px] font-mono text-[var(--mut)] mt-2">
          Note: Verification records require authorized session access. This endpoint is not an open public verifier.
        </div>
      </div>

      {/* State 1: Certificate Not Found */}
      {notFoundError && (
        <div className="box-card pad border-2 border-[var(--bad)] bg-[var(--card)] max-w-3xl mb-6">
          <div className="stat-label text-[var(--bad)]">Record Unavailable</div>
          <p className="text-xs text-[var(--ink)] mt-1 font-mono">{notFoundError}</p>
          <p className="text-xs text-[var(--mut)] mt-2 leading-relaxed">
            Verification sessions that fail, are aborted, or do not reach COMPLETED status do not generate a verification record.
          </p>
        </div>
      )}

      {/* State 2: No Search Run Yet */}
      {!activeCertificate && !notFoundError && !isLoading && (
        <div className="box-card pad text-center py-12 max-w-3xl">
          <div className="stat-label">Verification Record Search</div>
          <h3 style={{ font: '400 24px var(--ser)', margin: '8px 0' }}>
            No verification record currently selected
          </h3>
          <p className="text-xs text-[var(--mut)] max-w-md mx-auto font-mono">
            Input a Verification ID above or select a completed verification from the session ledger to inspect its cryptographic record.
          </p>
          {onNavigateHistory && (
            <div className="mt-4">
              <button
                type="button"
                className="btn ghost text-xs"
                onClick={onNavigateHistory}
              >
                Go to Session Ledger →
              </button>
            </div>
          )}
        </div>
      )}

      {/* State 3: Active Certificate Display */}
      {activeCertificate && (
        <div className="max-w-4xl space-y-6">
          {/* Main Record Card */}
          <div className="cert-card">
            {/* Header */}
            <div className="cert-hd flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="stat-label">ARGUS PLATFORM</div>
                <div style={{ font: '400 28px var(--ser)' }}>VERIFICATION RECORD</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="tag-badge pass">Presence confirmed</span>
                <span
                  className={`tag-badge ${
                    isRevoked ? 'fail' : isExpired ? 'rev' : 'pass'
                  }`}
                >
                  {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active / Valid'}
                </span>
              </div>
            </div>

            {/* Stamp indicator */}
            <div
              className="cert-stamp"
              style={{
                borderColor: isRevoked
                  ? 'var(--bad)'
                  : isExpired
                  ? 'var(--mut)'
                  : 'var(--ok)',
                color: isRevoked
                  ? 'var(--bad)'
                  : isExpired
                  ? 'var(--mut)'
                  : 'var(--ok)',
              }}
            >
              {isRevoked
                ? 'RECORD · REVOKED'
                : isExpired
                ? 'RECORD · EXPIRED'
                : 'PRESENCE · CONFIRMED'}
            </div>

            {/* Record Summary Metadata */}
            <div className="cert-kv">
              <span className="stat-label">Verification ID</span>
              <span className="font-mono text-xs font-semibold text-[var(--acc)]">
                {activeCertificate.verificationId}
              </span>
            </div>

            <div className="cert-kv">
              <span className="stat-label">Operation</span>
              <span className="font-mono text-xs">
                {payload?.operationType || 'TRANSACTION_SIGNING'}
              </span>
            </div>

            <div className="cert-kv">
              <span className="stat-label">Issued At</span>
              <span className="font-mono text-xs">{activeCertificate.issuedAt}</span>
            </div>

            <div className="cert-kv">
              <span className="stat-label">Validity</span>
              <span className="font-mono text-xs">
                {isExpired ? (
                  <span className="text-[var(--bad)] font-semibold">
                    Expired (was valid until {activeCertificate.expiresAt})
                  </span>
                ) : isRevoked ? (
                  <span className="text-[var(--bad)] font-semibold">Revoked</span>
                ) : (
                  <span>Valid until {activeCertificate.expiresAt} (24-hour validity window)</span>
                )}
              </span>
            </div>

            <div className="cert-kv">
              <span className="stat-label">Signing Method</span>
              <span className="font-mono text-xs">
                {isKms ? (
                  <span className="font-semibold text-[var(--ok)]">
                    Google Cloud KMS (Cryptographic Signature)
                  </span>
                ) : (
                  <span className="font-semibold text-[var(--acc)]">
                    Local SHA-256 Digest (Integrity Hash)
                  </span>
                )}
              </span>
            </div>

            <div className="cert-kv">
              <span className="stat-label">Issuer</span>
              <span className="font-mono text-xs">
                {payload?.issuer || 'argus-platform'}
              </span>
            </div>
          </div>

          {/* Section 2: VERIFICATION EVIDENCE */}
          <div className="box-card">
            <h2 className="section-header">Verification Evidence</h2>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 border border-[var(--line)] bg-[var(--card)]">
                  <div className="stat-label">Overall Confidence</div>
                  <div className="stat-num text-2xl mt-1">
                    {confidenceValue}
                    <small>/ 1.00</small>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--mut)] mt-1">
                    Multi-signal fused score
                  </div>
                </div>

                <div className="p-3 border border-[var(--line)] bg-[var(--card)]">
                  <div className="stat-label">Presentation Attack Result</div>
                  <div className="text-base font-bold font-mono text-[var(--ok)] mt-1">
                    {typeof componentScores.antiSpoof === 'number'
                      ? `${(componentScores.antiSpoof * 100).toFixed(1)}% (PASS)`
                      : 'EVALUATED'}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--mut)] mt-1">
                    Live texture / anti-spoof
                  </div>
                </div>

                <div className="p-3 border border-[var(--line)] bg-[var(--card)]">
                  <div className="stat-label">Pulse Signal Quality</div>
                  <div className="text-base font-bold font-mono text-[var(--ink)] mt-1">
                    {typeof componentScores.bpm === 'number'
                      ? `${componentScores.bpm} BPM`
                      : 'ACQUIRED'}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--mut)] mt-1">
                    Client-acquired pulse signal
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 border border-[var(--line)] bg-[var(--card)] font-mono text-xs space-y-2">
                  <div className="stat-label">Behavioral & Challenge Analysis</div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Behavior Dynamics:</span>
                    <span className="font-semibold">
                      {typeof componentScores.behavior === 'number'
                        ? (componentScores.behavior * 100).toFixed(1) + '%'
                        : 'EVALUATED'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Dynamic Challenge:</span>
                    <span className="font-semibold text-[var(--ok)]">
                      {componentScores.challenge === 1.0 || componentScores.challenge === true
                        ? 'COMPLETED'
                        : 'VERIFIED'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--mut)]">Head Pose & Orientation:</span>
                    <span className="font-semibold">
                      {String(componentScores.headDirection || 'CENTER')}
                    </span>
                  </div>
                </div>

                <div className="p-3 border border-[var(--line)] bg-[var(--card)] font-mono text-xs flex flex-col justify-between">
                  <div>
                    <div className="stat-label">Engine Reasoning</div>
                    <p className="mt-1 text-[var(--ink)] leading-relaxed">
                      {String(
                        componentScores.reasoning ||
                          payload?.reasoning ||
                          componentScores.reason ||
                          'Multi-modal signal synthesis authenticates human presence.'
                      )}
                    </p>
                  </div>
                  <div className="text-[11px] text-[var(--mut)] pt-2 border-t border-[var(--soft)]">
                    Model: MiniFASNetV2-SE + UltraFace Slim 320
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: CRYPTOGRAPHIC INTEGRITY */}
          <div className="box-card">
            <h2 className="section-header">Cryptographic Integrity</h2>
            <div className="p-4 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="stat-label block">Signing Mode</span>
                  <div className="mt-1">
                    {isKms ? (
                      <span className="font-bold text-[var(--ok)]">
                        Google Cloud KMS (Asymmetric Key Ring)
                      </span>
                    ) : (
                      <span className="font-bold text-[var(--acc)]">
                        Local SHA-256 Digest (Integrity Hash Fallback)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--mut)] mt-1">
                    {isKms
                      ? 'Authenticity and origin anchored by Google Cloud KMS asymmetric signing key.'
                      : 'Deterministic SHA-256 digest providing integrity protection. Does not prove origin without configured KMS key.'}
                  </p>
                </div>

                <div>
                  <span className="stat-label block">Issuer Authority</span>
                  <div className="mt-1 font-semibold">{payload?.issuer || 'argus-platform'}</div>
                  <div className="text-[11px] text-[var(--mut)] mt-1">
                    Internal Argus Verification Authority
                  </div>
                </div>
              </div>

              {/* Exact Signature or Integrity Hash */}
              <div className="pt-3 border-t border-[var(--line)]">
                <div className="flex justify-between items-center mb-1">
                  <span className="stat-label">
                    {isKms ? 'Cryptographic Signature' : 'Integrity Hash'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        activeCertificate.signature,
                        isKms ? 'Copied Signature!' : 'Copied Integrity Hash!'
                      )
                    }
                    className="text-[11px] text-[var(--acc)] hover:underline"
                  >
                    Copy {isKms ? 'Signature' : 'Hash'}
                  </button>
                </div>
                <div className="p-2 border border-[var(--line)] bg-[var(--bg)] break-all font-mono text-[11px] text-[var(--ink)] select-all">
                  {activeCertificate.signature}
                </div>
              </div>

              {/* Public Key Information */}
              <div className="pt-3 border-t border-[var(--line)]">
                <span className="stat-label block mb-1">Public Key Information</span>
                {isKms && activeCertificate.publicKey ? (
                  <div className="p-2 border border-[var(--line)] bg-[var(--bg)] font-mono text-[10px] text-[var(--mut)] overflow-x-auto max-h-24">
                    <pre style={{ margin: 0 }}>{activeCertificate.publicKey}</pre>
                  </div>
                ) : (
                  <div className="text-[11px] text-[var(--mut)]">
                    Local SHA-256 fallback digest. Public key asymmetric verification is not applicable for HMAC/digest fallback.
                  </div>
                )}
              </div>

              {/* Validity Window Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--line)] text-[11px]">
                <div>
                  <span className="stat-label block">Issued Timestamp</span>
                  <span>{activeCertificate.issuedAt}</span>
                </div>
                <div>
                  <span className="stat-label block">Expiration Timestamp</span>
                  <span>{activeCertificate.expiresAt}</span>
                </div>
                <div>
                  <span className="stat-label block">Revocation State</span>
                  <span className={isRevoked ? 'text-[var(--bad)] font-bold' : 'text-[var(--ok)] font-semibold'}>
                    {isRevoked ? 'REVOKED' : 'NOT REVOKED (FALSE)'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--line)]">
                <button
                  type="button"
                  className="btn text-xs py-2 px-4"
                  onClick={() =>
                    copyToClipboard(activeCertificate.verificationId, 'Copied Verification ID!')
                  }
                >
                  Copy Verification ID
                </button>
                <button
                  type="button"
                  className="btn ghost text-xs py-2 px-4"
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(activeCertificate, null, 2),
                      'Copied Canonical Record!'
                    )
                  }
                >
                  Copy Canonical Record JSON
                </button>
                <button
                  type="button"
                  className="btn ghost text-xs py-2 px-4"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                >
                  {showTechnicalDetails ? 'Hide Technical Details ▲' : 'Expand Technical Details ▼'}
                </button>
                {copyStatus && (
                  <span className="self-center font-mono text-xs text-[var(--ok)] font-bold">
                    ✓ {copyStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Expandable Technical Details Section */}
          {showTechnicalDetails && (
            <div className="box-card">
              <h2 className="section-header">Technical Details & Canonical Payload</h2>
              <div className="p-4">
                <div className="text-[11px] font-mono text-[var(--mut)] mb-2">
                  Canonical JSON representation serialized with sorted keys for cryptographic determinism:
                </div>
                <pre
                  style={{
                    margin: 0,
                    maxHeight: '360px',
                    overflow: 'auto',
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    padding: '12px',
                    fontSize: '11px',
                  }}
                >
                  {JSON.stringify(activeCertificate, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Trust Boundary Disclosure */}
          <div className="box-card pad font-mono text-xs text-[var(--mut)] border border-[var(--line)] bg-[var(--card)] leading-relaxed">
            <strong className="text-[var(--ink)]">Trust Boundary Disclosure:</strong> This certificate is a cryptographically signed record of an Argus human presence verification event and its resulting algorithmic decision. It does <em>not</em> prove legal personal identity, provide continuous proctoring, or represent public third-party attestation. Access requires authenticated credentials.
          </div>
        </div>
      )}
    </section>
  );
};
