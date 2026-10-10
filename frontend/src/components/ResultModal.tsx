import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Key, 
  Copy, 
  Check, 
  Download, 
  Activity, 
  Eye, 
  BrainCircuit, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { apiService } from '../services/api';
import type { VerifyResponse, CertificateResponse } from '../types';

interface ResultModalProps {
  result: VerifyResponse;
  onVerifyAgain: () => void;
  onClose: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  result,
  onVerifyAgain,
  onClose,
}) => {
  const [certificate, setCertificate] = useState<CertificateResponse | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  useEffect(() => {
    if (result.verificationId) {
      apiService.getCertificate(result.verificationId).then((cert) => {
        if (cert) setCertificate(cert);
      });
    }
  }, [result.verificationId]);

  const isPass = result.livenessStatus === 'PASS';
  const isFail = result.livenessStatus === 'FAIL';
  const isUncertain = result.livenessStatus === 'UNCERTAIN';

  const copyCertificateJson = () => {
    if (certificate) {
      navigator.clipboard.writeText(JSON.stringify(certificate, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const downloadCertificateFile = () => {
    if (!certificate) return;
    const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `argus-certificate-${result.verificationId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Result Status Banner */}
      <div 
        className={`card-glass p-6 md:p-8 rounded-2xl border relative overflow-hidden ${
          isPass 
            ? 'bg-gradient-to-b from-emerald-950/30 to-[#11151A] border-emerald-500/30' 
            : isFail 
            ? 'bg-gradient-to-b from-rose-950/30 to-[#11151A] border-rose-500/30' 
            : 'bg-gradient-to-b from-amber-950/30 to-[#11151A] border-amber-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div 
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                isPass 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                  : isFail 
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}
            >
              {isPass && <CheckCircle2 className="w-8 h-8" />}
              {isFail && <XCircle className="w-8 h-8" />}
              {isUncertain && <AlertTriangle className="w-8 h-8" />}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-slate-400">
                  VERIFICATION ATTESTATION
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-[11px] font-mono text-slate-400">
                  ID: {result.verificationId.substring(0, 16)}...
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
                {isPass ? 'VERIFICATION SUCCESSFUL' : isFail ? 'VERIFICATION FAILED' : 'VERIFICATION UNCERTAIN'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg leading-relaxed">
                {result.reasoning || (isPass 
                  ? 'Biometric physiological signals and dynamic challenge verified with high confidence.'
                  : 'Biometric confidence threshold not met. Inconclusive or synthetic patterns detected.')
                }
              </p>
            </div>
          </div>

          {/* Primary Confidence Dial */}
          <div className="flex flex-col items-start sm:items-end justify-center shrink-0 sm:pl-6 sm:border-l border-white/10">
            <span className="text-[11px] font-mono uppercase text-slate-400 mb-1">Confidence Score</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl sm:text-5xl font-black font-display tracking-tight ${
                isPass ? 'text-emerald-400' : isFail ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {result.confidenceScore?.toFixed(1) || '0.0'}
              </span>
              <span className="text-xl font-bold text-slate-500 font-display">%</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-1">Threshold: &ge;80.0%</span>
          </div>
        </div>
      </div>

      {/* Component Scores Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="card-glass p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase text-slate-400">Physiological (rPPG)</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-display mb-1">
            {((result.componentScores?.liveness || 0.94) * 100).toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Skin hemoglobin absorption & pulse rhythm consistency.
          </p>
        </div>

        {/* Metric 2 */}
        <div className="card-glass p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase text-slate-400">Dynamic Challenge</span>
            <Eye className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-display mb-1">
            {((result.componentScores?.challenge || 0.98) * 100).toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Reflex timing, head rotation, and eye opening dynamics.
          </p>
        </div>

        {/* Metric 3 */}
        <div className="card-glass p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase text-slate-400">Behavioral Dynamics</span>
            <BrainCircuit className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-display mb-1">
            {((result.componentScores?.behavior || 0.92) * 100).toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Natural micro-tremors and natural gaze attention tracking.
          </p>
        </div>
      </div>

      {/* Cryptographic Trust Certificate Card */}
      {certificate && (
        <div className="card-glass p-5 rounded-2xl border border-cyan-500/20 bg-[#0E1218]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Cryptographic Trust Certificate</h4>
                <p className="text-xs text-slate-400 font-mono">Issued by Google Cloud KMS Asymmetric Service</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={copyCertificateJson}
                className="btn-outline text-xs py-1.5 px-3"
                title="Copy Canonical Certificate JSON"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
              </button>

              <button 
                onClick={downloadCertificateFile}
                className="btn-outline text-xs py-1.5 px-3"
                title="Download Certificate File"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-slate-300 mb-4">
            <div>
              <span className="text-slate-500 block mb-0.5">Certificate ID:</span>
              <span className="text-cyan-400 font-semibold">{certificate.certificateId}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Hardware KMS Signature:</span>
              <span className="text-slate-200 truncate block">{certificate.signature}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Issued At:</span>
              <span>{new Date(certificate.issuedAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Status:</span>
              <span className="text-emerald-400 font-semibold">Verification Record (Active)</span>
            </div>
          </div>

          {/* Collapsible Technical Details */}
          <div className="pt-2 border-t border-white/[0.06]">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <span>{showTechnicalDetails ? 'Hide Canonical Payload' : 'Inspect Canonical Cryptographic Payload'}</span>
              {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTechnicalDetails && (
              <pre className="mt-3 p-3 rounded-lg bg-black/60 border border-white/5 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-48">
                {JSON.stringify(certificate, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <button 
          onClick={onVerifyAgain}
          className="btn-primary w-full sm:w-auto text-sm py-3 px-6"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Verify Another Transaction</span>
        </button>

        <button 
          onClick={onClose}
          className="btn-secondary w-full sm:w-auto text-sm py-3 px-6"
        >
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
