**Argus – AI Enhancement Proposal**  
**Google Solution Challenge 2026 – Build with AI**  
**Date:** April 25, 2026  
**Prepared by:** Chaitanya Thakar  
**Team:** Argus Team  

### 1. Current Project Status
Argus is already a **functional multi-modal liveness verification system**.

**What is Already Done:**
- Flutter mobile app with real-time camera capture and rPPG (green channel from forehead)
- Behavioral analysis (blinks, head movements, reaction timing)
- FFT-based heart rate detection
- Google-native cryptographic trust ledger using Cloud KMS + Firestore
- Fully deployed on Google Cloud Run (production backend ready)
- Nice result screen showing Liveness Score, BPM, Signal Quality, Behavior Score, Challenge Score, and “Secured by Google Ledger” badge

The core app and infrastructure are working end-to-end.

### 2. Problem We Need to Solve
In **Solution Challenge 2026 (Build with AI)**, judges expect strong and visible use of Google AI.  
Currently, our AI component is mostly rule-based. We need to add an intelligent AI layer to boost **Technical Merit** and **Innovation** scores significantly.

### 3. Proposed Feature: Gemini-Powered Liveness Reasoning Agent

**Feature Name:** Argus AI Forensic Reasoning Agent

**What We Will Build:**
- The backend will take the existing signals we already collect (green channel time-series, blink timings, head movement data, reaction latencies, etc.).
- All heavy processing and AI reasoning will happen on the **backend** (Cloud Run) → **minimal load on phones**, works smoothly on every device (including low-end Android phones).
- We will integrate **Google Gemini Flash** using **Gemini CLI / Vertex AI** to act as an intelligent "Forensic Liveness Agent".
- Gemini will:
  - Analyze the signals for natural pulse variability, realistic blink patterns, micro-movements, and unnatural consistency (typical of deepfakes or bots).
  - Provide a reasoned confidence score + short explanation.
  - If confidence is medium, dynamically suggest a new behavioral challenge.
- Final liveness score will be a smart blend of our current scores + Gemini’s AI reasoning.

**Key Advantages:**
- Works on **every phone** with very low device load (only raw signal capture on Flutter)
- Strong zero-knowledge privacy (only mathematical signals sent to backend)
- Very cheap to run (well under $25 for 10,000 verifications)
- Makes Argus clearly a **"Build with AI"** project using Google’s Gemini

### 4. Development Plan & Timeline

**We will develop this feature using Gemini CLI + Vertex AI integration.**

**Total Time Required:** **5–6 hours**

**Breakdown:**
- **Hour 1–1.5**: Add Spring AI Vertex AI Gemini dependency and basic configuration
- **Hour 1.5–3.5**: Create `LivenessReasoningService` and integrate Gemini Flash with optimized prompt
- **Hour 3.5–4.5**: Blend Gemini reasoning output with our existing liveness scores
- **Hour 4.5–5.5**: Add structured output (function calling) + basic adaptive challenge logic
- **Hour 5.5–6**: Deploy to Cloud Run + quick testing

This is realistic because:
- All signal capture, FFT processing, behavioral analysis, and trust ledger are **already built**.
- We only need to add the AI reasoning layer on top of existing data.

**Cost Control:**
- Use cheapest Gemini Flash model
- Keep prompts short and structured (JSON input/output)
- Scale-to-zero on Cloud Run
- Expected cost: **$14 – $20** for 10,000 verifications

### 5. Expected Impact on Solution Challenge Scores

- **Technical Merit (40%)**: Significant boost (from rule-based → intelligent Gemini reasoning)
- **Innovation & Creativity (25%)**: Much stronger (AI Forensic Agent for liveness detection)
- **Alignment with Cause**: Better SDG 9 & SDG 16 story (secure digital identity for everyone)
- **Overall**: Moves us from borderline to a **strong Top 100 contender**

### 6. Next Steps (Immediate)

1. **Today**: Team review and approval of this proposal
2. **Next 5–6 hours**: One team member implements the Gemini AI layer
3. **After implementation**: Quick testing on low-end devices + update result screen to show AI reasoning (optional but recommended)
4. **Tomorrow**: Prepare updated demo video and submission materials

**Risks & Mitigation:**
- Time overrun → Focus only on core reasoning first (adaptive part can be added later if time is tight)
- Cost → Strict prompt optimization and daily billing monitoring

---

**Recommendation:**  
We should go ahead with this upgrade. It is the **highest impact change** we can make with minimal effort (only 5–6 hours) because the foundation is already solid. This will make Argus clearly stand out as a Google AI-powered project.

**Team Feedback Needed:**  
Do we approve this plan? Who will implement the Gemini integration?
