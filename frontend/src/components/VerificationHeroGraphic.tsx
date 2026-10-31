import React from 'react';

export const VerificationHeroGraphic: React.FC = () => {
  return (
    <div className="relative w-full max-w-[640px] mx-auto select-none flex items-center justify-center pointer-events-none">
      <svg
        className="w-full h-auto block drop-shadow-[4px_4px_0_rgba(20,19,15,0.06)]"
        viewBox="0 0 680 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Argus Controlled Human Presence Verification process illustration"
      >
        {/* Grounding Soft Shadows */}
        <ellipse cx="140" cy="440" rx="45" ry="8" fill="rgba(20, 19, 15, 0.12)" />
        <ellipse cx="340" cy="445" rx="110" ry="12" fill="rgba(20, 19, 15, 0.12)" />
        <ellipse cx="530" cy="440" rx="45" ry="8" fill="rgba(20, 19, 15, 0.12)" />

        {/* ========================================================
             CENTER: THE VERIFICATION DEVICE (SMARTPHONE SCANNER)
             ======================================================== */}
        <g id="centerDevice">
          {/* Hard Drop Shadow for Phone */}
          <rect x="254" y="84" width="172" height="344" fill="var(--line, #14130F)" />
          {/* Phone Body */}
          <rect
            x="250"
            y="80"
            width="172"
            height="344"
            rx="20"
            fill="#FFFFFF"
            stroke="var(--line, #14130F)"
            strokeWidth="2.5"
          />
          {/* Speaker Ear-Piece */}
          <rect x="314" y="94" width="44" height="4" rx="2" fill="var(--line, #14130F)" />

          {/* Top Pill Badge: SCAN */}
          <g transform="translate(296, 114)">
            <rect x="0" y="0" width="80" height="22" fill="var(--canary, #FFE600)" stroke="var(--line, #14130F)" strokeWidth="1.5" />
            <text
              x="40"
              y="15"
              fontFamily="var(--mono, monospace)"
              fontSize="10"
              fontWeight="700"
              fill="var(--line, #14130F)"
              textAnchor="middle"
              letterSpacing="0.1em"
            >
              SCAN [●]
            </text>
          </g>

          {/* Face Scanner Viewport Frame */}
          <g transform="translate(284, 154)">
            {/* Outer Viewport */}
            <rect x="0" y="0" width="104" height="114" fill="var(--card, #F7F5EF)" stroke="#DDD8CE" strokeWidth="1" />

            {/* Scanning Brackets [  ] */}
            <path d="M 0 20 L 0 0 L 20 0" stroke="var(--line, #14130F)" strokeWidth="2.5" fill="none" />
            <path d="M 84 0 L 104 0 L 104 20" stroke="var(--line, #14130F)" strokeWidth="2.5" fill="none" />
            <path d="M 0 94 L 0 114 L 20 114" stroke="var(--line, #14130F)" strokeWidth="2.5" fill="none" />
            <path d="M 84 114 L 104 114 L 104 94" stroke="var(--line, #14130F)" strokeWidth="2.5" fill="none" />

            {/* Stylized User Face inside Device */}
            <path
              d="M 32 30 C 22 15 45 10 52 10 C 62 10 82 15 72 30 C 85 45 75 70 65 65 C 65 72 52 75 45 70 C 30 75 20 50 32 30 Z"
              fill="#14171F"
            />
            {/* Neck & Face */}
            <rect x="47" y="50" width="10" height="16" fill="#F4A261" />
            <ellipse cx="52" cy="46" rx="14" ry="16" fill="#F4A261" />
            {/* Yellow Top / Shirt */}
            <path
              d="M 28 80 C 35 66 45 66 52 66 C 59 66 69 66 76 80 Z"
              fill="var(--canary, #FFE600)"
              stroke="var(--line, #14130F)"
              strokeWidth="1.5"
            />

            {/* Pure Native SVG Animated Scanline Beam (Zero CSS transform glitches) */}
            <line x1="6" y1="20" x2="98" y2="20" stroke="var(--acc, #2B3FE0)" strokeWidth="2.5">
              <animate attributeName="y1" values="18; 96; 18" dur="2.8s" repeatCount="indefinite" />
              <animate attributeName="y2" values="18; 96; 18" dur="2.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3; 1; 0.3" dur="2.8s" repeatCount="indefinite" />
            </line>
          </g>

          {/* Bottom Big Label on Phone: "ARGUS" */}
          <text
            x="336"
            y="340"
            fontFamily="var(--ser, serif)"
            fontSize="28"
            fontWeight="700"
            fill="var(--line, #14130F)"
            textAnchor="middle"
            letterSpacing="-0.02em"
          >
            ARGUS
          </text>
          <text
            x="336"
            y="356"
            fontFamily="var(--mono, monospace)"
            fontSize="9"
            fontWeight="700"
            fill="var(--mut, #636159)"
            textAnchor="middle"
            letterSpacing="0.08em"
          >
            PRESENCE VERIFIED
          </text>
          {/* Home Bar Indicator */}
          <rect x="316" y="390" width="40" height="4" rx="2" fill="var(--line, #14130F)" />
        </g>

        {/* ========================================================
             LEFT SIDE: FLOATING BIOMETRIC RECORD + INVESTIGATOR FIGURE
             ======================================================== */}
        <g id="leftSheet" transform="translate(130, 130)">
          {/* Hard Drop Shadow */}
          <rect x="4" y="4" width="130" height="170" fill="var(--line, #14130F)" />
          {/* Sheet Body */}
          <rect x="0" y="0" width="130" height="170" fill="#E2DFD6" stroke="var(--line, #14130F)" strokeWidth="2" />

          {/* User Portrait Circle on Document */}
          <circle cx="65" cy="46" r="28" fill="#FFFFFF" stroke="var(--line, #14130F)" strokeWidth="1.5" />
          <ellipse cx="65" cy="44" rx="12" ry="14" fill="#F4A261" />
          <path
            d="M 50 40 C 44 26 60 22 65 22 C 73 22 84 26 80 40 C 88 50 78 62 72 58 C 70 64 60 64 56 60 C 46 62 42 48 50 40 Z"
            fill="#14171F"
          />
          <path d="M 48 68 C 54 58 65 58 65 58 C 65 58 76 58 82 68 Z" fill="var(--canary, #FFE600)" />

          {/* Document Text Lines */}
          <line x1="20" y1="94" x2="110" y2="94" stroke="#FFF" strokeWidth="4" strokeLinecap="round" />
          <line x1="20" y1="108" x2="110" y2="108" stroke="#FFF" strokeWidth="4" strokeLinecap="round" />

          {/* Mini rPPG Cardiac Wave on Document */}
          <path
            d="M 20 135 L 45 135 L 52 124 L 58 146 L 65 130 L 72 135 L 110 135"
            stroke="var(--acc, #2B3FE0)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <text
            x="20"
            y="156"
            fontFamily="var(--mono, monospace)"
            fontSize="8"
            fontWeight="700"
            fill="var(--line, #14130F)"
          >
            rPPG PULSE: 74 BPM
          </text>
        </g>

        {/* The Investigator / Operator Figure in Dark Suit */}
        <g id="operatorFigure">
          {/* Legs in Dark Slacks */}
          <line x1="130" y1="360" x2="125" y2="435" stroke="#14171F" strokeWidth="8" strokeLinecap="round" />
          <line x1="145" y1="360" x2="152" y2="435" stroke="#14171F" strokeWidth="8" strokeLinecap="round" />
          {/* Shoes */}
          <ellipse cx="121" cy="437" rx="8" ry="4" fill="#14171F" />
          <ellipse cx="156" cy="437" rx="8" ry="4" fill="#14171F" />

          {/* Torso in Dark Blazer */}
          <path d="M 120 270 L 155 270 L 150 365 L 125 365 Z" fill="#14171F" stroke="var(--line, #14130F)" strokeWidth="1.5" />
          {/* White Shirt Collar & Red Tie */}
          <polygon points="134,270 142,270 138,284" fill="#FFFFFF" />
          <polygon points="137,284 139,284 141,310 135,310" fill="var(--bad, #B31D1D)" />

          {/* Head & Hair */}
          <ellipse cx="137" cy="245" rx="9" ry="12" fill="#F4A261" />
          <path d="M 128 245 C 128 234 134 230 142 230 C 147 230 148 238 146 248 Z" fill="#14171F" />

          {/* Left Arm holding Giant Magnifying Glass pointing at Document */}
          <path d="M 152 285 L 180 275 L 195 240" stroke="#14171F" strokeWidth="6" strokeLinecap="round" fill="none" />
          <circle cx="195" cy="238" r="5" fill="#F4A261" />

          {/* The Magnifying Glass */}
          <line x1="195" y1="238" x2="180" y2="215" stroke="var(--line, #14130F)" strokeWidth="6" strokeLinecap="round" />
          <circle cx="165" cy="195" r="28" fill="rgba(255,255,255,0.75)" stroke="var(--line, #14130F)" strokeWidth="4" />
          <path d="M 150 185 Q 165 175 178 185" stroke="#FFF" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>

        {/* ========================================================
             RIGHT SIDE: VERIFICATION CHECKLIST + VERIFIED USER FIGURE
             ======================================================== */}
        <g id="rightChecklist" transform="translate(425, 130)">
          {/* Hard Drop Shadow */}
          <rect x="4" y="4" width="134" height="170" fill="var(--line, #14130F)" />
          {/* Sheet Body with Folded Bottom Right Corner */}
          <path d="M 0 0 L 134 0 L 134 145 L 110 170 L 0 170 Z" fill="#E2DFD6" stroke="var(--line, #14130F)" strokeWidth="2" />
          <path d="M 110 145 L 134 145 L 110 170 Z" fill="#C5C2BA" stroke="var(--line, #14130F)" strokeWidth="1.5" />

          {/* Checkmark 1: Pulse */}
          <g transform="translate(14, 22)">
            <path d="M 0 10 L 6 16 L 16 2" stroke="var(--ok, #0D7A3E)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="26" y1="9" x2="105" y2="9" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Checkmark 2: 3D Head Pose */}
          <g transform="translate(14, 52)">
            <path d="M 0 10 L 6 16 L 16 2" stroke="var(--ok, #0D7A3E)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="26" y1="9" x2="105" y2="9" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Checkmark 3: Anti-Spoof Shield */}
          <g transform="translate(14, 82)">
            <path d="M 0 10 L 6 16 L 16 2" stroke="var(--ok, #0D7A3E)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="26" y1="9" x2="105" y2="9" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Checkmark 4: KMS Attestation */}
          <g transform="translate(14, 112)">
            <path d="M 0 10 L 6 16 L 16 2" stroke="var(--ok, #0D7A3E)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="26" y1="9" x2="105" y2="9" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Verified Tag at bottom */}
          <text
            x="14"
            y="156"
            fontFamily="var(--mono, monospace)"
            fontSize="8"
            fontWeight="700"
            fill="var(--ok, #0D7A3E)"
          >
            ALL CHECKS PASSED ✓
          </text>
        </g>

        {/* The Verified User Figure Standing with Smartphone */}
        <g id="verifiedUserFigure">
          {/* Slender Legs */}
          <line x1="518" y1="365" x2="512" y2="435" stroke="#F4A261" strokeWidth="5" strokeLinecap="round" />
          <line x1="535" y1="365" x2="542" y2="435" stroke="#F4A261" strokeWidth="5" strokeLinecap="round" />
          {/* Shoes */}
          <path d="M 508 435 L 515 435 L 512 438 Z" fill="#14171F" />
          <path d="M 538 435 L 546 435 L 544 438 Z" fill="#14171F" />

          {/* Dark Pencil Skirt */}
          <path d="M 510 325 L 540 325 L 536 370 L 514 370 Z" fill="#14171F" stroke="var(--line, #14130F)" strokeWidth="1.5" />

          {/* Yellow Top / Blouse */}
          <path d="M 512 280 L 538 280 L 540 325 L 510 325 Z" fill="var(--canary, #FFE600)" stroke="var(--line, #14130F)" strokeWidth="1.5" />

          {/* Head & Hairstyle */}
          <ellipse cx="525" cy="254" rx="8" ry="11" fill="#F4A261" />
          <path d="M 516 250 C 516 238 534 238 534 250 C 538 260 538 285 532 290 C 528 290 522 285 520 270 Z" fill="#14171F" />

          {/* Left Arm on Hip */}
          <path d="M 512 285 L 498 305 L 510 320" stroke="#F4A261" strokeWidth="4.5" strokeLinecap="round" fill="none" />

          {/* Right Arm holding Smartphone in hand */}
          <path d="M 536 285 L 555 295 L 565 275" stroke="#F4A261" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          {/* Smartphone with Green Screen */}
          <rect x="562" y="260" width="10" height="18" rx="2" fill="#14171F" />
          <rect x="564" y="262" width="6" height="12" fill="var(--ok, #0D7A3E)" />
        </g>
      </svg>
    </div>
  );
};
