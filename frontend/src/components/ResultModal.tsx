import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
  Copy,
  Check,
  Download,
  Activity,
  Eye,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Home,
} from 'lucide-react';
import { apiService } from '../services/api';
import type { VerifyResponse, CertificateResponse } from '../types';

interface ResultModalProps {
  result: VerifyResponse;
  onVerifyAgain: () => void;
  onClose: () => void;
}

// Circular score ring component
const ScoreRing: React.FC<{ score: number | null; color: string; size?: number }> = ({
  score,
  color,
  size = 72,
}) => {
  const radius = (size - 8) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = score === null ? 0 : (score / 100) * circ;

  return (
    <div className="score-ring relative" role="img" aria-label={score === null ? 'Confidence score unavailable' : `Confidence ${score.toFixed(1)} percent`} style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold font-mono" style={{ color }}>
          {score === null ? '—' : `${score.toFixed(size > 100 ? 1 : 0)}%`}
        </span>
      </div>
    </div>
  );
};

export const ResultModal: React.FC<ResultModalProps> = ({ result, onVerifyAgain, onClose }) => {
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

  const statusConfig = isPass
    ? {
        icon: CheckCircle2,
        title: 'VERIFICATION SUCCESSFUL',
        subtitle: 'The verification service returned a PASS decision.',
        color: '#10B981',
        glow: 'rgba(16,185,129,0.12)',
        border: 'rgba(16,185,129,0.3)',
        bg: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(13,17,23,0.99) 60%)',
        iconBg: 'rgba(16,185,129,0.12)',
        iconBorder: 'rgba(16,185,129,0.3)',
        badge: 'SERVICE PASS',
        badgeBg: 'rgba(16,185,129,0.1)',
        badgeBorder: 'rgba(16,185,129,0.25)',
      }
    : isFail
    ? {
        icon: XCircle,
        title: 'VERIFICATION FAILED',
        subtitle: 'The verification service did not approve this verification.',
        color: '#EF4444',
        glow: 'rgba(239,68,68,0.10)',
        border: 'rgba(239,68,68,0.3)',
        bg: 'linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(13,17,23,0.99) 60%)',
        iconBg: 'rgba(239,68,68,0.12)',
        iconBorder: 'rgba(239,68,68,0.3)',
        badge: 'REJECTED',
        badgeBg: 'rgba(239,68,68,0.1)',
        badgeBorder: 'rgba(239,68,68,0.25)',
      }
    : {
        icon: AlertTriangle,
        title: 'VERIFICATION UNCERTAIN',
        subtitle: 'Inconclusive biometric signals. Please retry under better conditions.',
        color: '#F59E0B',
        glow: 'rgba(245,158,11,0.10)',
        border: 'rgba(245,158,11,0.3)',
        bg: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(13,17,23,0.99) 60%)',
        iconBg: 'rgba(245,158,11,0.12)',
        iconBorder: 'rgba(245,158,11,0.3)',
        badge: 'INCONCLUSIVE',
        badgeBg: 'rgba(245,158,11,0.1)',
        badgeBorder: 'rgba(245,158,11,0.25)',
      };

  const StatusIcon = statusConfig.icon;

  const metrics = [
    {
      label: 'Physiological (rPPG)',
      icon: Activity,
      value: result.componentScores?.liveness == null ? null : result.componentScores.liveness * 100,
      color: '#10B981',
      desc: 'Score returned by the verification service',
    },
    {
      label: 'Dynamic Challenge',
      icon: Eye,
      value: result.componentScores?.challenge == null ? null : result.componentScores.challenge * 100,
      color: '#00F2FE',
      desc: 'Score returned by the verification service',
    },
    {
      label: 'Behavioral Dynamics',
      icon: BrainCircuit,
      value: result.componentScores?.behavior == null ? null : result.componentScores.behavior * 100,
      color: '#8B5CF6',
      desc: 'Score returned by the verification service',
    },
  ];

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
    <div className="argus-page argus-result-page">

      {/* ── STATUS BANNER ── */}
      <div
        className="relative rounded-3xl p-7 overflow-hidden"
        style={{
          background: statusConfig.bg,
          border: `1px solid ${statusConfig.border}`,
          boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 60px ${statusConfig.glow}`,
        }}
      >
        <div className="shimmer-line" />

        {/* Background radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 20% 50%, ${statusConfig.glow} 0%, transparent 65%)`,
          }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* Status icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: statusConfig.iconBg,
                border: `1px solid ${statusConfig.iconBorder}`,
                boxShadow: `0 0 30px ${statusConfig.glow}`,
              }}
            >
              <StatusIcon className="w-9 h-9" style={{ color: statusConfig.color }} />
            </div>

            <div>
              {/* Badge */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-widest"
                  style={{
                    background: statusConfig.badgeBg,
                    color: statusConfig.color,
                    border: `1px solid ${statusConfig.badgeBorder}`,
                  }}
                >
                  {statusConfig.badge}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  ID: {result.verificationId?.substring(0, 16)}…
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1.5">
                {statusConfig.title}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-md">
                {result.reasoning || statusConfig.subtitle}
              </p>
            </div>
          </div>

          {/* Confidence score */}
          <div className="flex flex-col items-center gap-2 shrink-0 sm:pl-7 pt-4 sm:pt-0 sm:border-l" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Confidence</span>
            <ScoreRing score={result.confidenceScore} color={statusConfig.color} size={132} />
            <span className="text-[10px] font-mono text-slate-500">Service decision</span>
          </div>
        </div>
      </div>

      {/* ── COMPONENT SCORES ── */}
      {metrics.some((metric) => metric.value !== null) ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.filter((metric) => metric.value !== null).map((m, i) => {
          if (m.value === null) return null;
          const Icon = m.icon;
          return (
            <div
              key={i}
              className="relative rounded-2xl p-5 overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(20,25,32,0.9) 0%, rgba(13,17,23,0.98) 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 48px rgba(0,0,0,0.7), 0 0 20px ${m.color}22`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${m.color}44, transparent)` }}
              />

              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" style={{ color: m.color }} />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{m.label}</span>
                  </div>
                  <div className="text-3xl font-black" style={{ color: m.color, fontFamily: "'Outfit', sans-serif" }}>
                    {m.value.toFixed(1)}%
                  </div>
                </div>
                <ScoreRing score={m.value} color={m.color} size={64} />
              </div>

              <p className="text-[11px] text-slate-400 leading-snug">{m.desc}</p>
            </div>
          );
        })}
      </div> : (
        <div className="card-glass rounded-2xl p-5 text-sm text-slate-300">
          Component confidence scores were not returned for this verification.
        </div>
      )}

      {/* ── CERTIFICATE CARD ── */}
      {certificate && (
        <div
          className="relative rounded-2xl p-6 overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(0,242,254,0.04) 0%, rgba(13,17,23,0.98) 100%)',
            border: '1px solid rgba(0,242,254,0.2)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 30px rgba(0,242,254,0.06)',
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,242,254,0.4), transparent)' }}
          />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'rgba(0,242,254,0.08)',
                  border: '1px solid rgba(0,242,254,0.2)',
                  boxShadow: '0 0 16px rgba(0,242,254,0.15)',
                }}
              >
                <Key className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Cryptographic Trust Certificate</h4>
                <p className="text-[11px] text-slate-400 font-mono">{certificate.certificateData.issuer}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={copyCertificateJson} className="btn-outline text-xs py-1.5 px-3">
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>
              <button onClick={downloadCertificateFile} className="btn-outline text-xs py-1.5 px-3">
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono mb-5">
            {[
              { label: 'Certificate ID', value: certificate.certificateId, color: 'text-cyan-400' },
              { label: 'KMS Signature', value: certificate.signature, color: 'text-slate-300', truncate: true },
              { label: 'Issued At', value: new Date(certificate.issuedAt).toLocaleString() },
              { label: 'Status', value: certificate.revoked ? 'Revoked' : 'Active', color: certificate.revoked ? 'text-rose-400' : 'text-emerald-400' },
            ].map((field, i) => (
              <div key={i} className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-slate-500 block mb-1 uppercase tracking-widest text-[9px]">{field.label}</span>
                <span className={`${field.color || 'text-slate-300'} ${field.truncate ? 'truncate block' : ''} font-semibold`}>
                  {field.value}
                </span>
              </div>
            ))}
          </div>

          {/* Collapsible payload */}
          <div>
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showTechnicalDetails ? 'Hide Canonical Payload' : 'Inspect Canonical Cryptographic Payload'}</span>
            </button>

            {showTechnicalDetails && (
              <pre
                className="mt-3 p-4 rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-52"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(0,242,254,0.1)',
                  lineHeight: 1.6,
                }}
              >
                {JSON.stringify(certificate, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* ── ACTION FOOTER ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <button onClick={onVerifyAgain} className="btn-primary w-full sm:w-auto text-sm py-3.5 px-7">
          <RotateCcw className="w-4 h-4" />
          <span>Verify Another</span>
        </button>

        <button onClick={onClose} className="btn-secondary w-full sm:w-auto text-sm py-3.5 px-7">
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
