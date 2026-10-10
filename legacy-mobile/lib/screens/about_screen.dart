import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('SYSTEM ARCHITECTURE', style: AppTheme.monoBold.copyWith(fontSize: 14)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.s24, vertical: AppTheme.s16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Column(
                children: [
                  const ArgusLogo(size: 72),
                  const SizedBox(height: AppTheme.s12),
                  Text('ARGUS', style: AppTheme.headingDisplay.copyWith(fontSize: 36)),
                  const SizedBox(height: 2),
                  Text('PROOF OF HUMAN PRESENCE', style: AppTheme.monoBold.copyWith(fontSize: 11, color: AppTheme.primary)),
                  Text('VERSION 1.0.0 // SGP PRODUCTION', style: AppTheme.mono.copyWith(fontSize: 10, color: AppTheme.textMuted)),
                ],
              ),
            ),
            const SizedBox(height: AppTheme.s20),
            const EditorialDivider(label: 'MULTI-SIGNAL PIPELINE'),
            const SizedBox(height: AppTheme.s16),

            BrutalistCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSpecItem('01', 'rPPG Hemodynamic Pulse Engine',
                      'Extracts sub-pixel chromatic green-channel fluctuations from facial capillary beds to calculate authentic pulse rate (BPM).'),
                  const Divider(color: AppTheme.borderSoft),
                  _buildSpecItem('02', 'Behavioral Dynamics & Reflexes',
                      'Calculates EAR (Eye Aspect Ratio) for natural blinks, ocular saccades, and micro-movements to detect pre-recorded replay loops.'),
                  const Divider(color: AppTheme.borderSoft),
                  _buildSpecItem('03', 'Dynamic Challenge Verification',
                      'Issues cryptographic random reflex prompts (head turns, deliberate blinks) with sub-second reaction latency verification.'),
                  const Divider(color: AppTheme.borderSoft),
                  _buildSpecItem('04', 'Dual-Stage ONNX Anti-Spoofing',
                      'Runs UltraFace-Slim-320 detection and MiniFASNetV2-SE deep feature analysis to block silicon masks, 4K screen replays, and deepfakes.'),
                ],
              ),
            ),

            const SizedBox(height: AppTheme.s20),
            const EditorialDivider(label: 'ZERO-STORAGE PRIVACY'),
            const SizedBox(height: AppTheme.s16),

            BrutalistCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildPrivacyItem('EPHEMERAL RAM RETENTION',
                      'No raw facial images or video recordings are ever written to browser or device disks. All frames are evaluated in memory and discarded.'),
                  const SizedBox(height: AppTheme.s10),
                  _buildPrivacyItem('AUTOMATIC SESSION TTL',
                      'Verification sessions expire within 120 seconds. Nonces cannot be reused or replayed.'),
                  const SizedBox(height: AppTheme.s10),
                  _buildPrivacyItem('CRYPTOGRAPHIC KMS LEDGER',
                      'Signed SHA-256 audit trails ensure cryptographic tamper evidence on PostgreSQL with zero PII retention.'),
                ],
              ),
            ),

            const SizedBox(height: AppTheme.s20),
            const EditorialDivider(label: 'ENGINEERING STACK'),
            const SizedBox(height: AppTheme.s16),

            BrutalistCard(
              child: Column(
                children: [
                  _buildStackRow('BACKEND CORE', 'Spring Boot 3.4.1 (Java 21)'),
                  const SizedBox(height: AppTheme.s6),
                  _buildStackRow('ML INFERENCE', 'ONNX Runtime (Java Native)'),
                  const SizedBox(height: AppTheme.s6),
                  _buildStackRow('MOBILE ENGINE', 'Flutter 3.41 + Dart 3.11'),
                  const SizedBox(height: AppTheme.s6),
                  _buildStackRow('AUDIT STORE', 'Flyway + PostgreSQL Schema'),
                ],
              ),
            ),

            const SizedBox(height: AppTheme.s32),
            Center(
              child: Text(
                'ARGUS PLATFORM // SGP RELEASE',
                style: AppTheme.monoBold.copyWith(fontSize: 10, color: AppTheme.textMuted),
              ),
            ),
            const SizedBox(height: AppTheme.s16),
          ],
        ),
      ),
    );
  }

  Widget _buildSpecItem(String num, String title, String description) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(AppTheme.r2),
                ),
                child: Text(num, style: AppTheme.monoBold.copyWith(fontSize: 9, color: Colors.white)),
              ),
              const SizedBox(width: AppTheme.s8),
              Text(title, style: AppTheme.monoBold.copyWith(fontSize: 12, color: AppTheme.textPrimary)),
            ],
          ),
          const SizedBox(height: 4),
          Text(description, style: AppTheme.bodySmall.copyWith(fontSize: 11, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }

  Widget _buildPrivacyItem(String title, String description) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.shield_outlined, size: 14, color: AppTheme.success),
            const SizedBox(width: 6),
            Text(title, style: AppTheme.monoBold.copyWith(fontSize: 11, color: AppTheme.textPrimary)),
          ],
        ),
        const SizedBox(height: 2),
        Text(description, style: AppTheme.bodySmall.copyWith(fontSize: 11, color: AppTheme.textSecondary)),
      ],
    );
  }

  Widget _buildStackRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTheme.monoBold.copyWith(fontSize: 10, color: AppTheme.textMuted)),
        Text(value, style: AppTheme.mono.copyWith(fontSize: 11, color: AppTheme.textPrimary)),
      ],
    );
  }
}
