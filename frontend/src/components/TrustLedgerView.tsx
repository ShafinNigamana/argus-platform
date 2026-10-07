import React, { useState } from 'react';
import { Search, ShieldCheck, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';
import type { CertificateResponse } from '../types';

export const TrustLedgerView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchedCert, setSearchedCert] = useState<CertificateResponse | null>(null);
  const [searchStatus, setSearchStatus] = useState<'IDLE' | 'FOUND' | 'NOT_FOUND'>('IDLE');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const cert = await apiService.getCertificate(searchQuery.trim());
    if (cert) {
      setSearchedCert(cert);
      setSearchStatus('FOUND');
    } else {
      setSearchedCert(null);
      setSearchStatus('NOT_FOUND');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* View Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            Google-Native Trust Ledger
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
          Cryptographic Attestation & Certificate Validation
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
          Every Argus verification session is digitally attested by Google Cloud KMS hardware keys. Use this portal to validate the mathematical authenticity and proof-of-liveness of any issued certificate.
        </p>
      </div>

      {/* Certificate Search Box */}
      <div className="card-glass p-6 rounded-2xl">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter Verification UUID or Certificate ID (e.g. argus-fa82...)"
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>
          <button type="submit" className="btn-primary text-sm py-3 px-6 shrink-0">
            <span>Query Trust Ledger</span>
          </button>
        </form>

        {searchStatus === 'NOT_FOUND' && (
          <div className="mt-4 p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-center gap-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>No verification record matching ID found in ledger. Ensure the session was completed.</span>
          </div>
        )}
      </div>

      {/* Searched Certificate Result */}
      {searchedCert && (
        <div className="card-glass p-6 rounded-2xl border border-emerald-500/30 bg-[#0E131A] space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white font-display">Authentic Verification Certificate</h4>
                <p className="text-xs font-mono text-emerald-400">● Valid KMS Asymmetric Signature</p>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-white/5">
              Score: {searchedCert.certificateData.confidenceScore}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-black/40 border border-white/5">
              <span className="text-slate-500 block mb-1">Subject User ID:</span>
              <span className="text-white font-semibold">{searchedCert.certificateData.userId}</span>
            </div>
            <div className="p-3 rounded-lg bg-black/40 border border-white/5">
              <span className="text-slate-500 block mb-1">Operation Type:</span>
              <span className="text-cyan-400 font-semibold">{searchedCert.certificateData.operationType}</span>
            </div>
            <div className="p-3 rounded-lg bg-black/40 border border-white/5">
              <span className="text-slate-500 block mb-1">KMS Key Issuer:</span>
              <span className="text-slate-300">{searchedCert.certificateData.issuer}</span>
            </div>
            <div className="p-3 rounded-lg bg-black/40 border border-white/5">
              <span className="text-slate-500 block mb-1">Issued Timestamp:</span>
              <span className="text-slate-300">{new Date(searchedCert.issuedAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-black/60 border border-white/5">
            <span className="text-slate-500 block text-xs font-mono mb-1">Digital Signature (SHA-256):</span>
            <div className="text-[11px] font-mono text-slate-300 break-all bg-slate-900/80 p-2 rounded border border-white/5">
              {searchedCert.signature}
            </div>
          </div>
        </div>
      )}

      {/* Trust Ledger Architecture Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-white/[0.06]">
          <div className="text-xs font-mono text-cyan-400 uppercase font-semibold mb-1">Asymmetric Signing</div>
          <h4 className="text-sm font-bold text-white mb-1.5">Cloud KMS Hardware HSM</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Keys reside inside Google Cloud Key Management Service and cannot be exported or tampered with.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-white/[0.06]">
          <div className="text-xs font-mono text-indigo-400 uppercase font-semibold mb-1">Canonical Serialization</div>
          <h4 className="text-sm font-bold text-white mb-1.5">Deterministic JSON Digest</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            All verification payloads are canonically formatted to guarantee consistent byte hash computation.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-white/[0.06]">
          <div className="text-xs font-mono text-purple-400 uppercase font-semibold mb-1">Downstream Verifiability</div>
          <h4 className="text-sm font-bold text-white mb-1.5">Public Key Attestation</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Relying parties can verify signatures offline using Argus standard X.509 public keys.
          </p>
        </div>
      </div>
    </div>
  );
};
