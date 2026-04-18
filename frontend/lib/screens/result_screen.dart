import 'package:flutter/material.dart';

/// Data passed from the capture flow to the result screen.
class VerificationResult {
  const VerificationResult({
    required this.challengesPassed,
    required this.challengesTotal,
    required this.signalSamples,
  });

  final int challengesPassed;
  final int challengesTotal;
  final int signalSamples;

  int get challengeScore =>
      challengesTotal == 0 ? 0 : (challengesPassed * 100) ~/ challengesTotal;

  // Liveness score: weighted from challenges (70%) + signal presence (30%).
  // BPM and signal quality will come from backend in Phase 10.
  int get livenessScore {
    final challengeWeight = challengeScore * 0.7;
    final signalWeight = (signalSamples > 50 ? 100 : signalSamples * 2).clamp(0, 100) * 0.3;
    return (challengeWeight + signalWeight).round().clamp(0, 100);
  }

  bool get passed => challengesPassed == challengesTotal && challengesTotal > 0;

  String get status => passed ? 'PASS' : 'FAIL';
}

class ResultScreen extends StatelessWidget {
  const ResultScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final result = ModalRoute.of(context)?.settings.arguments as VerificationResult?;

    // Fallback if no data passed (shouldn't happen in normal flow).
    final score = result?.livenessScore ?? 0;
    final passed = result?.passed ?? false;
    final challengesPassed = result?.challengesPassed ?? 0;
    final challengesTotal = result?.challengesTotal ?? 0;

    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              const Spacer(),
              // Score circle
              Container(
                width: 160,
                height: 160,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: passed
                        ? const Color(0xFF00C853)
                        : const Color(0xFFD50000),
                    width: 4,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '$score',
                      style: TextStyle(
                        color: passed
                            ? const Color(0xFF00C853)
                            : const Color(0xFFD50000),
                        fontSize: 56,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'out of 100',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.5),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // Status badge
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                decoration: BoxDecoration(
                  color: passed
                      ? const Color(0xFF00C853).withValues(alpha: 0.2)
                      : const Color(0xFFD50000).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  passed ? 'VERIFIED — REAL HUMAN' : 'VERIFICATION FAILED',
                  style: TextStyle(
                    color: passed
                        ? const Color(0xFF00C853)
                        : const Color(0xFFD50000),
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ),
              const SizedBox(height: 40),
              // Detail cards
              _DetailRow(
                  label: 'Liveness Score', value: '$score / 100'),
              const SizedBox(height: 12),
              _DetailRow(
                  label: 'Heart Rate (BPM)',
                  value: 'Pending'), // Will come from backend
              const SizedBox(height: 12),
              _DetailRow(
                  label: 'Signal Samples',
                  value: '${result?.signalSamples ?? 0}'),
              const SizedBox(height: 12),
              _DetailRow(
                  label: 'Challenges',
                  value: '$challengesPassed / $challengesTotal passed'),
              const SizedBox(height: 12),
              _DetailRow(
                  label: 'Status',
                  value: result?.status ?? 'N/A'),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () => Navigator.pushNamedAndRemoveUntil(
                    context,
                    '/',
                    (route) => false,
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7C4DFF),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  child: const Text('DONE'),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.6),
              fontSize: 15,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
