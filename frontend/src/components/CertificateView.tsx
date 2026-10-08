import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { CertificateResponse } from '../types';

interface CertificateViewProps {
  initialVerificationId?: string;
}

export const CertificateView: React.FC<CertificateViewProps> = ({
  initialVerificationId = '',
}) => {
  const [lookupId, setLookupId] = useState<string>(initialVerificationId);
  const [activeCertificate, setActiveCertificate] = useState<CertificateResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<string>('');
  const [notFoundError, setNotFoundError] = useState<string | null>(null);

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
        setNotFoundError(`Certificate not found for ID "${id.trim()}". Cryptographic certificates are only minted for verifications that achieve an authoritative PASS verdict.`);
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

  const handleDownloadJson = () => {
    if (!activeCertificate) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeCertificate, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `argus-certificate-${activeCertificate.verificationId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyJson = () => {
    if (!activeCertificate) return;
    navigator.clipboard.writeText(JSON.stringify(activeCertificate, null, 2));
    setCopyStatus('Copied JSON!');
    setTimeout(() => setCopyStatus(''), 2000);
  };

  return (
    <section className="view-content" id="ce">
      <div className="eyebrow">04 · Cryptographic Certificates</div>
      <h1 className="view-title">
        A verification you can <i>check</i> later.
      </h1>
      <p className="lede">
        Signed via Google Cloud KMS with an immutable digital key. Anyone holding the Verification ID can independently verify cryptographic integrity without accessing raw biometric video frames.
      </p>

      {/* ID Lookup bar */}
      <div className="box-card pad mb-6" style={{ maxWidth: '640px' }}>
        <div className="stat-label mb-1">Attestation Verification Lookup</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadCertificate(lookupId);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Enter Verification UUID (e.g. 819bf50a-...)"
            className="flex-1 px-3 py-2 border-2 border-[var(--line)] bg-[var(--card)] font-mono text-xs text-[var(--ink)] focus:outline-none"
          />
          <button
            type="submit"
            className="btn text-xs py-2 px-4"
            disabled={isLoading || !lookupId.trim()}
          >
            {isLoading ? 'Verifying...' : 'Query Certificate'}
          </button>
        </form>
      </div>

      {/* State 1: Certificate Not Found / Unavailable */}
      {notFoundError && (
        <div className="box-card pad border-2 border-[var(--bad)] bg-[var(--card)] max-w-2xl mb-6">
          <div className="stat-label text-[var(--bad)]">Certificate Unavailable</div>
          <p className="text-xs text-[var(--ink)] mt-1 font-mono">{notFoundError}</p>
          <p className="text-xs text-[var(--mut)] mt-2">
            Verification sessions that fail or are aborted do not generate a KMS attestation record. Check the ID or execute a new verification session.
          </p>
        </div>
      )}

      {/* State 2: No Search Run Yet */}
      {!activeCertificate && !notFoundError && !isLoading && (
        <div className="box-card pad text-center py-12 max-w-2xl">
          <div className="stat-label">Attestation Search Ready</div>
          <h3 style={{ font: '400 24px var(--ser)', margin: '8px 0' }}>
            No certificate currently loaded
          </h3>
          <p className="text-xs text-[var(--mut)] max-w-md mx-auto">
            Input a Verification ID above or navigate from the History tab to inspect signed attestation metadata.
          </p>
        </div>
      )}

      {/* State 3: Active Certificate Display */}
      {activeCertificate && (
        <div className="g g2">
          {/* Left: Certificate Card with 8px hard offset shadow and stamp */}
          <div className="cert-card">
            <div className="cert-hd">
              <div>
                <div className="stat-label">Verification Attestation Record</div>
                <div style={{ font: '400 32px var(--ser)' }}>
                  {activeCertificate.verificationId.substring(0, 18)}...
                </div>
              </div>
              <span className={`tag-badge ${activeCertificate.revoked ? 'fail' : 'pass'}`}>
                {activeCertificate.revoked ? 'REVOKED' : 'VALID ATTESTATION'}
              </span>
            </div>

            <div className="cert-stamp">HUMAN · LIVE</div>

            <div className="cert-kv">
              <span className="stat-label">Decision</span>
              <span className="font-semibold text-[var(--ok)]">
                PASS · Confidence {(activeCertificate.certificateData.confidenceScore > 1 ? activeCertificate.certificateData.confidenceScore / 100 : activeCertificate.certificateData.confidenceScore).toFixed(2)}
              </span>
            </div>
            <div className="cert-kv">
              <span className="stat-label">Issued Time</span>
              <span className="m">{activeCertificate.issuedAt}</span>
            </div>
            <div className="cert-kv">
              <span className="stat-label">Expires Time</span>
              <span className="m">{activeCertificate.expiresAt}</span>
            </div>
            <div className="cert-kv">
              <span className="stat-label">Issuer Authority</span>
              <span className="m">{activeCertificate.certificateData.issuer || 'argus-cloud-kms-v1'}</span>
            </div>
            <div className="cert-kv">
              <span className="stat-label">Method</span>
              <span>rPPG + Behaviour + Dynamic Challenge + ONNX Anti-Spoof</span>
            </div>
            <div className="cert-kv">
              <span className="stat-label">Digital Signature</span>
              <span className="m truncate">{activeCertificate.signature || 'ECDSA_SHA256'}</span>
            </div>
            {activeCertificate.publicKey && (
              <div className="cert-kv">
                <span className="stat-label">Public Key</span>
                <span className="m truncate">{activeCertificate.publicKey}</span>
              </div>
            )}

            <div style={{ padding: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn ghost text-xs"
                onClick={handleCopyJson}
              >
                {copyStatus || 'Copy Attestation JSON'}
              </button>
              <button
                type="button"
                className="btn ghost text-xs"
                onClick={handleDownloadJson}
              >
                Download Signed Record
              </button>
            </div>
          </div>

          {/* Right: Machine-Readable JSON */}
          <div className="box-card">
            <h2 className="section-header">Machine-Readable Attestation</h2>
            <pre style={{ margin: 0, height: '100%', minHeight: '340px' }}>
              {JSON.stringify(activeCertificate, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
};
