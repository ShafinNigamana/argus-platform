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
        title: Text('About Argus', style: AppTheme.heading3),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppTheme.s24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: AppTheme.s16),
            const ArgusLogo(size: 80),
            const SizedBox(height: AppTheme.s16),
            Text('ARGUS', style: AppTheme.heading1.copyWith(
              letterSpacing: 8,
            )),
            const SizedBox(height: AppTheme.s4),
            Text('Proof of human presence', style: AppTheme.body),
            const SizedBox(height: AppTheme.s4),
            Text('v1.0.0', style: AppTheme.mono),
            const SizedBox(height: AppTheme.s40),

            _section('How It Works', [
              _item(Icons.camera_alt_outlined,
                  'Your front camera captures subtle color changes on your skin caused by blood flow.'),
              _item(Icons.favorite_border,
                  'Argus extracts your heartbeat signal using remote photoplethysmography (rPPG).'),
              _item(Icons.psychology_outlined,
                  'Behavioral patterns like blinks and head movements are analyzed for naturalness.'),
              _item(Icons.task_alt,
                  'Interactive challenges verify you are responding in real time.'),
              _item(Icons.verified_user_outlined,
                  'All signals are processed by AI to produce a tamper-proof liveness verdict.'),
            ]),
            const SizedBox(height: AppTheme.s32),

            _section('Privacy', [
              _item(Icons.visibility_off_outlined,
                  'No images or video are stored or transmitted. Only extracted signal values are sent.'),
              _item(Icons.delete_outline,
                  'Sessions expire automatically and cannot be replayed.'),
              _item(Icons.lock_outline,
                  'Results are secured by Google Cloud Ledger for tamper-proof verification.'),
            ]),
            const SizedBox(height: AppTheme.s32),

            _section('Built With', [
              _item(Icons.flutter_dash, 'Flutter + Dart'),
              _item(Icons.cloud_outlined, 'Google Cloud Run'),
              _item(Icons.face, 'Google ML Kit'),
              _item(Icons.memory, 'Spring Boot + AI Scoring'),
            ]),
            const SizedBox(height: AppTheme.s40),

            Text('Google Solution Challenge 2025',
                style: AppTheme.bodySmall.copyWith(color: AppTheme.textMuted)),
            const SizedBox(height: AppTheme.s32),
          ],
        ),
      ),
    );
  }

  Widget _section(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: AppTheme.heading3),
        const SizedBox(height: AppTheme.s12),
        ...children,
      ],
    );
  }

  Widget _item(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppTheme.s12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppTheme.primary.withValues(alpha: 0.6), size: 20),
          const SizedBox(width: AppTheme.s12),
          Expanded(child: Text(text, style: AppTheme.bodySmall)),
        ],
      ),
    );
  }
}
