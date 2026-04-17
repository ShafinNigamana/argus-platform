import 'package:flutter/material.dart';

class AlignmentScreen extends StatelessWidget {
  const AlignmentScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              const Spacer(),
              // Face guide oval
              Container(
                width: 200,
                height: 260,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(100),
                  border: Border.all(
                    color: const Color(0xFF7C4DFF),
                    width: 2,
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.face,
                    size: 80,
                    color: Color(0xFF7C4DFF),
                  ),
                ),
              ),
              const SizedBox(height: 40),
              const Text(
                'Position Your Face',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              _GuideItem(
                icon: Icons.light_mode,
                text: 'Make sure you have good lighting',
              ),
              const SizedBox(height: 16),
              _GuideItem(
                icon: Icons.center_focus_strong,
                text: 'Center your face in the frame',
              ),
              const SizedBox(height: 16),
              _GuideItem(
                icon: Icons.phone_android,
                text: 'Hold your phone steady',
              ),
              const SizedBox(height: 16),
              _GuideItem(
                icon: Icons.person,
                text: 'Only one face should be visible',
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () =>
                      Navigator.pushReplacementNamed(context, '/capture'),
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
                  child: const Text("I'M READY"),
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

class _GuideItem extends StatelessWidget {
  final IconData icon;
  final String text;
  const _GuideItem({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFF00E5FF), size: 24),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.7),
              fontSize: 15,
            ),
          ),
        ),
      ],
    );
  }
}
