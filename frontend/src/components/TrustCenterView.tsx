import React, { useState } from 'react';

export const TrustCenterView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'data' | 'signals' | 'security' | 'limits'>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>('philosophy');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <section className="view-content" id="trust-center" aria-label="Trust, Privacy and Limitations Center">
      <div className="eyebrow">06 · TRANSPARENCY & VERIFIED CAPABILITIES</div>
      <h1 className="view-title">
        Trust, Privacy &amp; <i>System Limitations.</i>
      </h1>
      <p className="lede">
        Argus is an evidence-based human presence verification platform. We believe transparency is the foundation of digital trust. Here are the exact technical specifications of what Argus measures, what data is processed, what is stored, and what the platform does not claim.
      </p>

      {/* Core Mission Banner */}
      <div className="box-card pad my-6 border-l-4 border-l-[var(--acc)] bg-[var(--card)]">
        <div className="stat-label text-[var(--acc)]">Core Architectural Thesis</div>
        <p className="text-base text-[var(--ink)] mt-2 font-serif italic">
          &ldquo;Argus does not identify who you are. It evaluates whether sufficient evidence exists that a live human was physically present during the verification event.&rdquo;
        </p>
        <p className="text-xs text-[var(--mut)] mt-2 font-mono leading-relaxed">
          Argus is NOT a legal KYC provider, does NOT perform continuous proctoring, does NOT execute facial recognition against user databases, and does NOT claim guaranteed fraud prevention.
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          className={`btn text-xs ${activeTab === 'all' ? '' : 'ghost'}`}
          onClick={() => setActiveTab('all')}
        >
          All Topics
        </button>
        <button
          type="button"
          className={`btn text-xs ${activeTab === 'signals' ? '' : 'ghost'}`}
          onClick={() => setActiveTab('signals')}
        >
          Evidence Signals
        </button>
        <button
          type="button"
          className={`btn text-xs ${activeTab === 'data' ? '' : 'ghost'}`}
          onClick={() => setActiveTab('data')}
        >
          Privacy &amp; Data Flow
        </button>
        <button
          type="button"
          className={`btn text-xs ${activeTab === 'security' ? '' : 'ghost'}`}
          onClick={() => setActiveTab('security')}
        >
          Security Controls
        </button>
        <button
          type="button"
          className={`btn text-xs ${activeTab === 'limits' ? '' : 'ghost'}`}
          onClick={() => setActiveTab('limits')}
        >
          Limitations &amp; Roadmap
        </button>
      </div>

      {/* SECTION 1: WHAT ARGUS VERIFIES */}
      {(activeTab === 'all' || activeTab === 'signals') && (
        <div className="box-card pad mb-6">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('philosophy')}>
            <div>
              <span className="text-xs font-mono text-[var(--acc)] font-bold">SECTION 01</span>
              <h2 style={{ font: '400 24px var(--ser)', margin: '4px 0' }}>What Argus Verifies vs. What It Does Not</h2>
            </div>
            <span className="font-mono text-sm text-[var(--mut)]">{expandedSection === 'philosophy' ? '−' : '+'}</span>
          </div>

          {(expandedSection === 'philosophy' || activeTab !== 'all') && (
            <div className="mt-4 pt-4 border-t border-[var(--soft)] space-y-4">
              <p className="text-xs text-[var(--ink)] font-mono leading-relaxed">
                Argus verifies <strong>evidence of human presence</strong>. It answers a specific question: <em>&ldquo;Is a live, physical human participating in this session at this specific instant?&rdquo;</em> It explicitly decouples biological vitality from identity attribution.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border border-[var(--soft)]">
                  <thead>
                    <tr className="bg-[var(--soft)]/30 border-b border-[var(--soft)]">
                      <th className="p-2 border-r border-[var(--soft)] font-semibold text-[var(--ink)]">Argus Human Presence Verification</th>
                      <th className="p-2 font-semibold text-[var(--bad)]">What Argus Is NOT (Explicit Non-Claims)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--soft)]">
                    <tr>
                      <td className="p-2 border-r border-[var(--soft)] text-[var(--ok)] font-medium">✓ Evaluates optical micro-vascular pulse fluctuations</td>
                      <td className="p-2 text-[var(--mut)]">✗ Identity verification or KYC document matching</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-[var(--soft)] text-[var(--ok)] font-medium">✓ Detects presentation attacks (screens, masks, replays)</td>
                      <td className="p-2 text-[var(--mut)]">✗ Facial recognition or biometric identity matching</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-[var(--soft)] text-[var(--ok)] font-medium">✓ Validates active challenge responses (blinks, turns)</td>
                      <td className="p-2 text-[var(--mut)]">✗ Continuous proctoring or ongoing user surveillance</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-[var(--soft)] text-[var(--ok)] font-medium">✓ Point-in-time cryptographic attestation record</td>
                      <td className="p-2 text-[var(--mut)]">✗ Guaranteed fraud prevention or zero-vulnerability shield</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-[var(--soft)] text-[var(--ok)] font-medium">✓ Backend-authoritative multi-modal evidence synthesis</td>
                      <td className="p-2 text-[var(--mut)]">✗ Blockchain or distributed ledger technology</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: SIGNAL EXPLANATION */}
      {(activeTab === 'all' || activeTab === 'signals') && (
        <div className="box-card pad mb-6">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('signals')}>
            <div>
              <span className="text-xs font-mono text-[var(--acc)] font-bold">SECTION 02</span>
              <h2 style={{ font: '400 24px var(--ser)', margin: '4px 0' }}>Multi-Modal Signal Architecture &amp; Disclosures</h2>
            </div>
            <span className="font-mono text-sm text-[var(--mut)]">{expandedSection === 'signals' ? '−' : '+'}</span>
          </div>

          {(expandedSection === 'signals' || activeTab !== 'all') && (
            <div className="mt-4 pt-4 border-t border-[var(--soft)] space-y-4">
              <p className="text-xs text-[var(--ink)] font-mono leading-relaxed">
                Argus does not rely on any single fallible sensor. Five independent evidence vectors contribute to the final backend-authoritative decision:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Signal 1 */}
                <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--ink)] font-mono">01 · Pulse / Physiological Signal</span>
                    <span className="tag-badge text-[10px]">Client-Acquired</span>
                  </div>
                  <p className="text-xs text-[var(--mut)] font-mono mt-2 leading-relaxed">
                    Browser-acquired optical photoplethysmography (rPPG). Samples micro-vascular color shifts in the green optical spectrum from the facial Region of Interest (ROI).
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-[var(--wn)] border-t border-[var(--soft)] pt-2">
                    <strong>Disclosure:</strong> This physiological signal is acquired client-side in the browser runtime. It does NOT represent independent hardware or server-side optical attestation.
                  </div>
                </div>

                {/* Signal 2 */}
                <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--ink)] font-mono">02 · Presentation Attack Detection</span>
                    <span className="tag-badge text-[10px]">Server-Side ONNX</span>
                  </div>
                  <p className="text-xs text-[var(--mut)] font-mono mt-2 leading-relaxed">
                    Evaluates a single 320×240 facial snapshot using the MiniFASNetV2-SE neural network executing via ONNX Runtime on the Java backend.
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-[var(--wn)] border-t border-[var(--soft)] pt-2">
                    <strong>Disclosure:</strong> Designed to detect presentation attacks such as replayed screens, printed paper photos, and physical masks. It does NOT claim to detect every possible attack vector.
                  </div>
                </div>

                {/* Signal 3 */}
                <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--ink)] font-mono">03 · Behavior &amp; Interaction</span>
                    <span className="tag-badge text-[10px]">Challenge Response</span>
                  </div>
                  <p className="text-xs text-[var(--mut)] font-mono mt-2 leading-relaxed">
                    Requires completion of an active, randomized challenge prompt (e.g., eye blink cadence, head turn left/right) within a strict time window.
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-[var(--wn)] border-t border-[var(--soft)] pt-2">
                    <strong>Disclosure:</strong> Evaluates prompt compliance and response latency. Does NOT claim perfect behavioral authenticity or continuous biometric keystroke profiling.
                  </div>
                </div>

                {/* Signal 4 */}
                <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--ink)] font-mono">04 · Head Pose &amp; Orientation</span>
                    <span className="tag-badge text-[10px]">Point-in-Time</span>
                  </div>
                  <p className="text-xs text-[var(--mut)] font-mono mt-2 leading-relaxed">
                    Calculates 3D facial orientation (yaw, pitch, roll) from the submitted snapshot to verify direct camera engagement and posture alignment.
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-[var(--wn)] border-t border-[var(--soft)] pt-2">
                    <strong>Disclosure:</strong> Point-in-time snapshot evaluation only. Argus does NOT continuously track or record head pose after the verification event concludes.
                  </div>
                </div>
              </div>

              {/* Multi-Signal Decision Synthesis */}
              <div className="border border-[var(--soft)] p-3 bg-[var(--bg)] mt-4">
                <div className="font-bold text-xs text-[var(--ink)] font-mono">05 · Multi-Signal Decision Synthesis (Backend Authoritative)</div>
                <p className="text-xs text-[var(--mut)] font-mono mt-1 leading-relaxed">
                  Individual signals are aggregated by the backend Verification Orchestrator against the platform confidence threshold (0.80). Fatal attack signals (such as presentation spoofing or multi-face presence) trigger an immediate failure override, regardless of pulse strength.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: PRIVACY & DATA FLOW */}
      {(activeTab === 'all' || activeTab === 'data') && (
        <div className="box-card pad mb-6">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('privacy')}>
            <div>
              <span className="text-xs font-mono text-[var(--acc)] font-bold">SECTION 03</span>
              <h2 style={{ font: '400 24px var(--ser)', margin: '4px 0' }}>Privacy, Data Flow &amp; Persistence</h2>
            </div>
            <span className="font-mono text-sm text-[var(--mut)]">{expandedSection === 'privacy' ? '−' : '+'}</span>
          </div>

          {(expandedSection === 'privacy' || activeTab !== 'all') && (
            <div className="mt-4 pt-4 border-t border-[var(--soft)] space-y-4">
              <p className="text-xs text-[var(--ink)] font-mono leading-relaxed">
                We believe in rigorous truth in privacy engineering. We do not make misleading claims like &ldquo;your image never leaves your device.&rdquo; Here is the exact data lifecycle:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                  <div className="text-[var(--acc)] font-bold text-xs mb-1">STAGE 1: BROWSER SAMPLING</div>
                  <ul className="list-disc pl-4 space-y-1 text-[var(--mut)] text-[11px]">
                    <li>Requests camera access via standard MediaDevices API.</li>
                    <li>Samples frames locally at ~640×480 resolution.</li>
                    <li>Calculates pulse color shift in browser memory.</li>
                    <li>Continuous video is NEVER recorded or transmitted.</li>
                  </ul>
                </div>

                <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                  <div className="text-[var(--acc)] font-bold text-xs mb-1">STAGE 2: SNAPSHOT INGRESS</div>
                  <ul className="list-disc pl-4 space-y-1 text-[var(--mut)] text-[11px]">
                    <li>One single 320×240 JPEG snapshot is sent to the backend.</li>
                    <li>Transmitted over encrypted TLS to the verification completion endpoint.</li>
                    <li>Backend decodes the JPEG into memory for ONNX inference.</li>
                    <li>Snapshot is processed transiently and immediately released.</li>
                  </ul>
                </div>

                <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                  <div className="text-[var(--acc)] font-bold text-xs mb-1">STAGE 3: LEDGER PERSISTENCE</div>
                  <ul className="list-disc pl-4 space-y-1 text-[var(--mut)] text-[11px]">
                    <li>Raw image is <strong>NEVER stored</strong> in PostgreSQL.</li>
                    <li>Raw rPPG waveforms are <strong>NEVER stored</strong>.</li>
                    <li>Derived scalar scores (confidence, BPM, verdict) are stored.</li>
                    <li>Audit trail and cryptographic certificates are persisted.</li>
                  </ul>
                </div>
              </div>

              {/* Exact Data Inventory Table */}
              <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                <div className="font-bold text-xs text-[var(--ink)] font-mono mb-2">Verified Persistence Inventory</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border border-[var(--soft)]">
                    <thead>
                      <tr className="bg-[var(--soft)]/30 border-b border-[var(--soft)]">
                        <th className="p-2 border-r border-[var(--soft)]">Artifact</th>
                        <th className="p-2 border-r border-[var(--soft)]">Location</th>
                        <th className="p-2 border-r border-[var(--soft)]">Persisted?</th>
                        <th className="p-2">Retention Policy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--soft)]">
                      <tr>
                        <td className="p-2 border-r border-[var(--soft)] font-medium">Continuous Webcam Video</td>
                        <td className="p-2 border-r border-[var(--soft)]">Browser RAM only</td>
                        <td className="p-2 border-r border-[var(--soft)] text-[var(--bad)] font-semibold">NO</td>
                        <td className="p-2 text-[var(--mut)]">Never written to disk; discarded upon tab close</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-[var(--soft)] font-medium">Verification Snapshot (320×240 JPEG)</td>
                        <td className="p-2 border-r border-[var(--soft)]">Backend JVM RAM</td>
                        <td className="p-2 border-r border-[var(--soft)] text-[var(--bad)] font-semibold">NO</td>
                        <td className="p-2 text-[var(--mut)]">Transient inference only; not written to PostgreSQL</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-[var(--soft)] font-medium">rPPG Photoplethysmography Waveform</td>
                        <td className="p-2 border-r border-[var(--soft)]">Browser RAM</td>
                        <td className="p-2 border-r border-[var(--soft)] text-[var(--bad)] font-semibold">NO</td>
                        <td className="p-2 text-[var(--mut)]">Discarded immediately after signal scoring</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-[var(--soft)] font-medium">Derived Scalar Scores &amp; BPM</td>
                        <td className="p-2 border-r border-[var(--soft)]">PostgreSQL DB</td>
                        <td className="p-2 border-r border-[var(--soft)] text-[var(--ok)] font-semibold">YES</td>
                        <td className="p-2 text-[var(--mut)]">Retained in verification session record</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-[var(--soft)] font-medium">Cryptographic Certificate Record</td>
                        <td className="p-2 border-r border-[var(--soft)]">PostgreSQL DB</td>
                        <td className="p-2 border-r border-[var(--soft)] text-[var(--ok)] font-semibold">YES</td>
                        <td className="p-2 text-[var(--mut)]">Time-bounded validity (24 hours from issuance)</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-[var(--soft)] font-medium">Security Audit Trail Events</td>
                        <td className="p-2 border-r border-[var(--soft)]">PostgreSQL DB</td>
                        <td className="p-2 border-r border-[var(--soft)] text-[var(--ok)] font-semibold">YES</td>
                        <td className="p-2 text-[var(--mut)]">Retained for administrative and compliance auditing</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: AI & GEMINI TELEMETRY PRIVACY */}
      {(activeTab === 'all' || activeTab === 'data') && (
        <div className="box-card pad mb-6">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('gemini')}>
            <div>
              <span className="text-xs font-mono text-[var(--acc)] font-bold">SECTION 04</span>
              <h2 style={{ font: '400 24px var(--ser)', margin: '4px 0' }}>AI &amp; Google Cloud Vertex AI / Gemini Privacy</h2>
            </div>
            <span className="font-mono text-sm text-[var(--mut)]">{expandedSection === 'gemini' ? '−' : '+'}</span>
          </div>

          {(expandedSection === 'gemini' || activeTab !== 'all') && (
            <div className="mt-4 pt-4 border-t border-[var(--soft)] space-y-4">
              <p className="text-xs text-[var(--ink)] font-mono leading-relaxed">
                The Argus backend incorporates an optional forensic reasoning integration with Google Cloud Vertex AI (Gemini 2.5 Flash Lite). Here are the exact implementation realities verified from our production source code:
              </p>

              <div className="g g2">
                <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                  <div className="font-bold text-xs text-[var(--ink)] font-mono mb-1">What Data is Transmitted to Gemini</div>
                  <p className="text-xs text-[var(--mut)] font-mono leading-relaxed">
                    Argus transmits <strong>strictly numerical and categorical telemetry</strong>:
                  </p>
                  <ul className="list-disc pl-4 mt-2 space-y-1 text-xs font-mono text-[var(--ink)]">
                    <li>Statistical response latencies (e.g., reaction time in milliseconds)</li>
                    <li>Challenge completion indicators (e.g., blink detected = true)</li>
                    <li>Micro-vascular pulse statistics (e.g., estimated BPM, signal SNR)</li>
                    <li>Mathematical telemetry entropy measures</li>
                  </ul>
                  <div className="mt-3 text-xs font-mono text-[var(--ok)] font-semibold border-t border-[var(--soft)] pt-2">
                    ✓ ZERO raw facial images, snapshots, or video frames are EVER transmitted to Gemini or Vertex AI.
                  </div>
                </div>

                <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                  <div className="font-bold text-xs text-[var(--ink)] font-mono mb-1">Fallback &amp; High Availability</div>
                  <p className="text-xs text-[var(--mut)] font-mono leading-relaxed">
                    Gemini integration is completely non-blocking:
                  </p>
                  <ul className="list-disc pl-4 mt-2 space-y-1 text-xs font-mono text-[var(--mut)]">
                    <li>If Google Cloud Vertex AI credentials are not provisioned,</li>
                    <li>If external network connectivity is unavailable, or</li>
                    <li>If API latency exceeds operational deadlines,</li>
                  </ul>
                  <p className="text-xs font-mono text-[var(--ink)] mt-2">
                    The backend gracefully falls back to local in-process heuristic and ONNX telemetry evaluation without service disruption.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: CRYPTOGRAPHIC VERIFICATION RECORDS */}
      {(activeTab === 'all' || activeTab === 'security') && (
        <div className="box-card pad mb-6">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('crypto')}>
            <div>
              <span className="text-xs font-mono text-[var(--acc)] font-bold">SECTION 05</span>
              <h2 style={{ font: '400 24px var(--ser)', margin: '4px 0' }}>Cryptographic Verification Records &amp; Signing Modes</h2>
            </div>
            <span className="font-mono text-sm text-[var(--mut)]">{expandedSection === 'crypto' ? '−' : '+'}</span>
          </div>

          {(expandedSection === 'crypto' || activeTab !== 'all') && (
            <div className="mt-4 pt-4 border-t border-[var(--soft)] space-y-4">
              <p className="text-xs text-[var(--ink)] font-mono leading-relaxed">
                An Argus Certificate is <strong>a cryptographically signed record of an Argus verification event and its resulting decision</strong>. It does not certify legal identity; it certifies that a specific verification event occurred with specific measured evidence at a given timestamp.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[var(--acc)]">Cloud KMS Asymmetric Signature</span>
                    <span className="tag-badge text-[10px]">PRODUCTION HSM</span>
                  </div>
                  <p className="text-[var(--mut)] leading-relaxed">
                    Uses Google Cloud KMS hardware security modules (HSMs). The canonical certificate payload is signed with an asymmetric private key (ECDSA P-256 with SHA-256).
                  </p>
                  <p className="text-[var(--ink)] mt-2">
                    <strong>Verification:</strong> Any relying party holding the public key can verify that the record was generated by the authentic Argus KMS key without tampering.
                  </p>
                </div>

                <div className="border border-[var(--soft)] p-3 bg-[var(--card)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[var(--wn)]">Local SHA-256 Integrity Hash</span>
                    <span className="tag-badge text-[10px]">LOCAL FALLBACK</span>
                  </div>
                  <p className="text-[var(--mut)] leading-relaxed">
                    Active when Cloud KMS credentials are not configured (development/offline). Generates a cryptographic SHA-256 digest over the canonical JSON certificate payload.
                  </p>
                  <p className="text-[var(--bad)] mt-2">
                    <strong>Honest Distinction:</strong> This mode is an <em>integrity hash / checksum</em> proving payload non-tampering. It is NOT an asymmetric cryptographic signature.
                  </p>
                </div>
              </div>

              <div className="border border-[var(--soft)] p-3 bg-[var(--bg)] text-xs font-mono text-[var(--mut)]">
                <span className="font-bold text-[var(--ink)]">Access Boundaries:</span> Certificates have a 24-hour expiration window. Certificate retrieval requires authenticated credentials (the session owner or an authorized operator). Public unauthenticated verification is not currently implemented.
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 6: VERIFIED SECURITY CONTROLS */}
      {(activeTab === 'all' || activeTab === 'security') && (
        <div className="box-card pad mb-6">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('controls')}>
            <div>
              <span className="text-xs font-mono text-[var(--acc)] font-bold">SECTION 06</span>
              <h2 style={{ font: '400 24px var(--ser)', margin: '4px 0' }}>Implemented Security Controls</h2>
            </div>
            <span className="font-mono text-sm text-[var(--mut)]">{expandedSection === 'controls' ? '−' : '+'}</span>
          </div>

          {(expandedSection === 'controls' || activeTab !== 'all') && (
            <div className="mt-4 pt-4 border-t border-[var(--soft)] space-y-3">
              <p className="text-xs text-[var(--ink)] font-mono leading-relaxed">
                The following security controls are actively implemented and tested in the codebase:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="border border-[var(--soft)] p-2.5">
                  <div className="font-bold text-[var(--ink)]">JWT Authentication &amp; Token Expiration</div>
                  <p className="text-[var(--mut)] mt-1 text-[11px]">Enforces Bearer tokens signed with cryptographic keys. Rejecting forged, expired, or malformed credentials across all API ingress.</p>
                </div>

                <div className="border border-[var(--soft)] p-2.5">
                  <div className="font-bold text-[var(--ink)]">Role-Based Access Control (RBAC)</div>
                  <p className="text-[var(--mut)] mt-1 text-[11px]">Strict 4-tier role enforcement: USER, ADMIN, SUPERADMIN, and AUDIT. View and action boundaries are verified at both UI and controller layers.</p>
                </div>

                <div className="border border-[var(--soft)] p-2.5">
                  <div className="font-bold text-[var(--ink)]">Verification Ownership Authorization</div>
                  <p className="text-[var(--mut)] mt-1 text-[11px]">Regular users can only access their own verification records and mutate active sessions they created. Cross-user data access is blocked with 403 Forbidden.</p>
                </div>

                <div className="border border-[var(--soft)] p-2.5">
                  <div className="font-bold text-[var(--ink)]">Dual-Stage Multi-Face Rejection</div>
                  <p className="text-[var(--mut)] mt-1 text-[11px]">UltraFace Slim 320 detects the exact number of faces in frame. If more than one face is detected, verification is immediately rejected to prevent proxy attendance.</p>
                </div>

                <div className="border border-[var(--soft)] p-2.5">
                  <div className="font-bold text-[var(--ink)]">In-Memory Rate Limiting</div>
                  <p className="text-[var(--mut)] mt-1 text-[11px]">Throttles excessive verification attempts per client IP / identifier to mitigate brute-force denial-of-service and replay floods.</p>
                </div>

                <div className="border border-[var(--soft)] p-2.5">
                  <div className="font-bold text-[var(--ink)]">Relational Audit Logging</div>
                  <p className="text-[var(--mut)] mt-1 text-[11px]">Tracks verification lifecycle state changes, administrative logouts, policy adjustments, and operator actions with client IP and timestamps in PostgreSQL.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 7: PLATFORM LIMITATIONS */}
      {(activeTab === 'all' || activeTab === 'limits') && (
        <div className="box-card pad mb-6">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('limits')}>
            <div>
              <span className="text-xs font-mono text-[var(--bad)] font-bold">SECTION 07 · HONEST DISCLOSURES</span>
              <h2 style={{ font: '400 24px var(--ser)', margin: '4px 0' }}>Known Limitations &amp; Operating Boundaries</h2>
            </div>
            <span className="font-mono text-sm text-[var(--mut)]">{expandedSection === 'limits' ? '−' : '+'}</span>
          </div>

          {(expandedSection === 'limits' || activeTab !== 'all') && (
            <div className="mt-4 pt-4 border-t border-[var(--soft)] space-y-4">
              <p className="text-xs text-[var(--ink)] font-mono leading-relaxed">
                Engineers build trust through rigorous acknowledgement of limitations. Argus operates within the following deliberate constraints:
              </p>

              <div className="space-y-3">
                <div className="border-l-2 border-l-[var(--bad)] pl-3 py-1">
                  <div className="font-bold text-xs text-[var(--ink)] font-mono">1. Presence Verification is NOT Identity Verification</div>
                  <p className="text-xs text-[var(--mut)] font-mono mt-0.5 leading-relaxed">
                    Argus confirms that a living human was physically in front of the sensor. It does not prove that the human is John Doe or Jane Smith. Identity binding requires integration with authoritative identity providers.
                  </p>
                </div>

                <div className="border-l-2 border-l-[var(--bad)] pl-3 py-1">
                  <div className="font-bold text-xs text-[var(--ink)] font-mono">2. No Guaranteed Fraud Prevention</div>
                  <p className="text-xs text-[var(--mut)] font-mono mt-0.5 leading-relaxed">
                    No physical or computational biometric pipeline can claim 100% immunity against novel, sophisticated generative synthesis or specialized physical prosthetic attacks. Argus raises the economic cost of spoofing significantly.
                  </p>
                </div>

                <div className="border-l-2 border-l-[var(--bad)] pl-3 py-1">
                  <div className="font-bold text-xs text-[var(--ink)] font-mono">3. Environmental &amp; Optical Hardware Variances</div>
                  <p className="text-xs text-[var(--mut)] font-mono mt-0.5 leading-relaxed">
                    Low ambient lighting, high camera sensor noise, heavy backlight, or extreme head movement will diminish optical rPPG pulse extraction fidelity, occasionally yielding an inconclusive verdict.
                  </p>
                </div>

                <div className="border-l-2 border-l-[var(--bad)] pl-3 py-1">
                  <div className="font-bold text-xs text-[var(--ink)] font-mono">4. Point-in-Time Snapshot Analysis (Not Continuous Proctoring)</div>
                  <p className="text-xs text-[var(--mut)] font-mono mt-0.5 leading-relaxed">
                    Argus verifies human presence at the exact moment of the verification session. It does NOT watch, record, or proctor users before or after that verification event.
                  </p>
                </div>

                <div className="border-l-2 border-l-[var(--bad)] pl-3 py-1">
                  <div className="font-bold text-xs text-[var(--ink)] font-mono">5. Third-Party Relying Party Architecture is Currently Simulated</div>
                  <p className="text-xs text-[var(--mut)] font-mono mt-0.5 leading-relaxed">
                    External relying-party protocols (OAuth2/OIDC claims, automated webhooks) are not currently deployed in production. The assessment integration in this release is a faithful relying-party demonstration.
                  </p>
                </div>

                <div className="border-l-2 border-l-[var(--bad)] pl-3 py-1">
                  <div className="font-bold text-xs text-[var(--ink)] font-mono">6. Policy Storage vs. Engine Enforcement</div>
                  <p className="text-xs text-[var(--mut)] font-mono mt-0.5 leading-relaxed">
                    The active policy management CRUD interface stores organizational confidence thresholds in PostgreSQL, while the current core Java decision engine enforces a compiled 80% baseline threshold.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 8: CURRENT CAPABILITIES VS ROADMAP */}
      {(activeTab === 'all' || activeTab === 'limits') && (
        <div className="box-card pad mb-6">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('roadmap')}>
            <div>
              <span className="text-xs font-mono text-[var(--acc)] font-bold">SECTION 08</span>
              <h2 style={{ font: '400 24px var(--ser)', margin: '4px 0' }}>Current Capabilities vs. Future Roadmap</h2>
            </div>
            <span className="font-mono text-sm text-[var(--mut)]">{expandedSection === 'roadmap' ? '−' : '+'}</span>
          </div>

          {(expandedSection === 'roadmap' || activeTab !== 'all') && (
            <div className="mt-4 pt-4 border-t border-[var(--soft)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Available Today */}
                <div className="border border-[var(--ok)]/40 p-4 bg-[var(--card)]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 bg-[var(--ok)] inline-block"></span>
                    <h3 className="text-xs font-mono font-bold text-[var(--ink)] uppercase tracking-wider">
                      Available Today (Implemented &amp; Tested)
                    </h3>
                  </div>
                  <ul className="space-y-2 text-xs font-mono text-[var(--ink)]">
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--ok)] font-bold">✓</span>
                      <span>Browser-based human presence verification workflow</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--ok)] font-bold">✓</span>
                      <span>Client-acquired optical pulse (rPPG) extraction</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--ok)] font-bold">✓</span>
                      <span>Server-side ONNX presentation attack detection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--ok)] font-bold">✓</span>
                      <span>Dual-stage face detection &amp; multi-face rejection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--ok)] font-bold">✓</span>
                      <span>Interactive dynamic liveness challenge (blinks, turns)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--ok)] font-bold">✓</span>
                      <span>Point-in-time 3D head pose and orientation analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--ok)] font-bold">✓</span>
                      <span>Backend-authoritative multi-modal evidence decision</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--ok)] font-bold">✓</span>
                      <span>PostgreSQL relational verification history ledger</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--ok)] font-bold">✓</span>
                      <span>Cryptographic verification records (KMS &amp; SHA-256)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--ok)] font-bold">✓</span>
                      <span>Role-scoped Operator &amp; Audit Console with RBAC</span>
                    </li>
                  </ul>
                </div>

                {/* Future Roadmap */}
                <div className="border border-[var(--soft)] p-4 bg-[var(--card)]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 bg-[var(--mut)] inline-block"></span>
                    <h3 className="text-xs font-mono font-bold text-[var(--mut)] uppercase tracking-wider">
                      Future Roadmap (Planned Capabilities)
                    </h3>
                  </div>
                  <ul className="space-y-2 text-xs font-mono text-[var(--mut)]">
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--mut)] font-bold">○</span>
                      <span>Production Relying-Party OAuth2/OIDC OpenID Connect Federation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--mut)] font-bold">○</span>
                      <span>External API key &amp; client service credential management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--mut)] font-bold">○</span>
                      <span>Hosted verification links and cross-origin iframe embed SDK</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--mut)] font-bold">○</span>
                      <span>Automated outbound webhooks &amp; event notification dispatch</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--mut)] font-bold">○</span>
                      <span>Public unauthenticated certificate verification portal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--mut)] font-bold">○</span>
                      <span>Hierarchical multi-tenant enterprise organizational structure</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--mut)] font-bold">○</span>
                      <span>Dedicated browser extension / companion proctoring integration</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default TrustCenterView;
