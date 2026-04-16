import 'package:flutter/material.dart';

class ResultScreen extends StatelessWidget {
  const ResultScreen({super.key});

  // Mock data — will be replaced with real backend response in Phase 10.
  static const int _mockScore = 78;
  static const String _mockStatus = 'PASS';
  static const int _mockBpm = 72;
  static const double _mockSignalQuality = 0.85;

  @override
  Widget build(BuildContext context) {
    final passed = _mockStatus == 'PASS';

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
                      '$_mockScore',
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
              _DetailRow(label: 'Liveness Score', value: '$_mockScore / 100'),
              const SizedBox(height: 12),
              _DetailRow(label: 'Heart Rate (BPM)', value: '$_mockBpm'),
              const SizedBox(height: 12),
              _DetailRow(
                label: 'Signal Quality',
                value: '${(_mockSignalQuality * 100).round()}%',
              ),
              const SizedBox(height: 12),
              const _DetailRow(label: 'Challenges', value: 'Passed'),
              const SizedBox(height: 12),
              _DetailRow(
                label: 'Status',
                value: _mockStatus,
              ),
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
