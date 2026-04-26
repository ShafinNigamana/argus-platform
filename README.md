<div align="center">

# 👁️ Argus
**Next-Generation Human Verification & Liveness Detection**

[![Flutter](https://img.shields.io/badge/Frontend-Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)]()
[![Spring Boot](https://img.shields.io/badge/Backend-Spring_Boot-6DB33F?style=for-the-badge&logo=spring&logoColor=white)]()
[![Google Cloud](https://img.shields.io/badge/Infra-Google_Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)]()
[![Firebase](https://img.shields.io/badge/Database-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)]()
[![Status](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)]()

*Built for the Google Solution Challenge 2026*

**Built with Google technologies** — Flutter, Cloud Run, Vertex AI (Gemini 2.5 Flash-Lite), ML Kit, Cloud KMS, and Firestore.

</div>

---

## 🌟 What is Argus?
Argus is an advanced identity verification platform that ensures the person on the other side of the screen is a **real, living human being**. By combining facial biomechanics, heart-rate estimation (rPPG), and a Google-native cryptographic ledger, Argus defends against deepfakes, replay attacks, and automated bots.

## 🚀 Key Features

### 🧠 1. Multi-Modal Liveness Detection
Argus doesn't just look at a photo. It actively analyzes biological signals:
*   **Facial Biometrics**: High-speed face tracking using Google ML Kit.
*   **rPPG Signal Extraction**: Detects the microscopic color changes in human skin caused by heartbeat pulses (photoplethysmography).
*   **Behavioral Intelligence**: Analyzes natural blinking patterns and smooth head movements.

### 🛡️ 2. Intelligent Challenge-Response
To stop video recordings or deepfakes, Argus issues randomized, timed challenges:
*   **Dynamic Instructions**: Users are prompted to "Blink twice" or "Turn your head".
*   **Precision Timing**: Tracks reactions down to the millisecond to distinguish natural human reflexes from instant, automated bot scripts.

### 🔗 3. Google-Native Trust Ledger
Every successful verification is anchored to a **Cryptographic Ledger** powered exclusively by Google Cloud.
*   **Immutable Chain**: Each verification record is mathematically linked to the previous one, creating an unbreakable chain of trust.
*   **Official Verification**: Results are digitally signed by hardware-secured keys (**Google Cloud KMS**), making them impossible to forge.

### 🧠 4. Adaptive AI Liveness Reasoning Agent (Built with Gemini 2.5 Flash-Lite)
To elevate simple rule-based detection into true **"Build with AI"** intelligence, Argus includes an **Adaptive Multi-Modal Liveness Reasoning Agent** powered by **Google Gemini 2.5 Flash-Lite**.

- **How it works**:
  - **On-device**: Only lightweight raw signal capture (green channel time-series + behavioral timestamps) — minimal load, works on every phone (including low-end devices).
  - **Backend**: Existing rPPG + FFT processing + behavioral data is sent as compact structured JSON.
  - **Gemini 2.5 Flash-Lite acts as a forensic expert**: Analyzes natural heart-rate variability (HRV), evaluates realistic blink dynamics, and detects unnatural consistency typical of deepfakes or bots. It uses **thinking mode** for step-by-step reasoning.
  - **Final Score**: The liveness score blends traditional math signals with intelligent AI reasoning.

---

## 🛠️ Technical Architecture

- **Frontend**: Flutter (Dart) + CameraX / ML Kit (minimal on-device processing for low device load)
- **Backend**: Spring Boot 3.5 (Java 21) on **Google Cloud Run** (serverless, auto-scaling)
- **AI Layer**: Gemini 2.5 Flash-Lite via Vertex AI (Adaptive Reasoning Agent with thinking mode)
- **Signal Processing**: rPPG via green-channel FFT + behavioral timing analysis
- **Trust Layer**: Google Cloud KMS (asymmetric signing) + Firestore (immutable cryptographic ledger chain)
- **Deployment**: Fully serverless on Google Cloud (us-central1)

---

## 🌍 Impact & Sustainable Development Goals (SDGs)

Argus tackles the rising threat of **AI-generated deepfakes, replay attacks, and identity fraud** that undermines trust in digital services.

### United Nations Sustainable Development Goals (UN SDGs)
Argus directly contributes to two key UN SDGs:
- **SDG 9: Industry, Innovation and Infrastructure**: We build resilient, inclusive, and innovative digital infrastructure. By providing affordable, secure verification, Argus enables small businesses and fintech platforms to adopt trustworthy identity systems.
- **SDG 16: Peace, Justice and Strong Institutions**: We strengthen institutions by reducing identity theft and fraud. This supports Target 16.9 — *“Provide legal identity for all”* — by making secure digital identity verification accessible and reliable.

### India Context & National Priorities
In India, digital identity fraud is a growing challenge affecting banking (**UPI**, Aadhaar-linked services), online education, and government schemes (**DBT - Direct Benefit Transfer**). 

Argus aligns with **India’s SDG commitments** under NITI Aayog:
- **Financial Inclusion**: Designed to be lightweight and work on low-end smartphones common across India, enabling secure digital access for millions in Tier-2/3 cities and rural areas.
- **Fraud Protection**: Protects users from rising deepfake threats in **Aadhaar**, banking, and government service delivery.

**User-Centric Iteration**: Tested with 10+ users across different devices and lighting. We incorporated feedback to improve forehead ROI detection and added **AI Reasoning Explanations** so users understand their verification status.

---

## 📊 Cost Efficiency & Scalability
- **AI Cost**: ~$12–20 for 10,000 liveness verifications (using Gemini 2.5 Flash-Lite + aggressive prompt optimization).
- **Infrastructure**: Google Cloud Run + Firestore + KMS stays mostly within **free tier** for moderate usage.
- **Scalability**: Fully serverless architecture designed to handle thousands of concurrent verifications at minimum cost.

## 🔒 Privacy & Security First
*   **Edge Processing**: Facial analysis is performed locally on your device—your video feed is never saved or transmitted.
*   **Secure Cloud Architecture**: Verification metadata is stored using enterprise-grade encryption on Google Cloud Run and Firestore.
*   **100% Serverless**: High availability and scaling powered by Google Cloud Run.

---

## 🚀 Future Roadmap
- Multi-language challenge support
- Advanced deepfake artifact detection using multimodal capabilities
- Integration with banking/fintech APIs for real-world deployment

## 📄 License
This project is built for the Google Solution Challenge 2026.

---
<div align="center">
<b>Argus</b> | Google Solution Challenge 2026
</div>