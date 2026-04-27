import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../theme/app_theme.dart';

/// Three-slide onboarding shown on first launch only.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  static const _slides = [
    _Slide(
      icon: Icons.favorite_border,
      title: 'Heartbeat Detection',
      body: 'Argus detects your heartbeat through your phone camera using remote photoplethysmography (rPPG).',
    ),
    _Slide(
      icon: Icons.psychology_outlined,
      title: 'Behavioral Analysis',
      body: 'Follow simple instructions to prove you are a real human. No passwords, no biometric data stored.',
    ),
    _Slide(
      icon: Icons.verified_user_outlined,
      title: 'Tamper-Proof Results',
      body: 'Every verification is secured by Google Cloud Ledger. Results cannot be forged or replayed.',
    ),
  ];

  Future<void> _complete() async {
    HapticFeedback.mediumImpact();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_done', true);
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/home');
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Skip button
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.s16),
                child: GestureDetector(
                  onTap: _complete,
                  child: Text('Skip', style: AppTheme.bodySmall.copyWith(
                    color: AppTheme.textMuted,
                  )),
                ),
              ),
            ),

            // Pages
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _page = i),
                itemBuilder: (context, i) {
                  final slide = _slides[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.s40),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 100, height: 100,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.primary.withValues(alpha: 0.08),
                          ),
                          child: Icon(slide.icon,
                              size: 44, color: AppTheme.primary),
                        ),
                        const SizedBox(height: AppTheme.s32),
                        Text(slide.title, style: AppTheme.heading2,
                            textAlign: TextAlign.center),
                        const SizedBox(height: AppTheme.s16),
                        Text(slide.body, style: AppTheme.body,
                            textAlign: TextAlign.center),
                      ],
                    ),
                  );
                },
              ),
            ),

            // Dots + button
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppTheme.s32, 0, AppTheme.s32, AppTheme.s40),
              child: Row(
                children: [
                  // Page dots
                  Row(
                    children: List.generate(_slides.length, (i) {
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        width: i == _page ? 24 : 8,
                        height: 8,
                        margin: const EdgeInsets.only(right: 6),
                        decoration: BoxDecoration(
                          color: i == _page
                              ? AppTheme.primary
                              : AppTheme.textMuted.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const Spacer(),
                  // Next / Get Started
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      if (_page == _slides.length - 1) {
                        _complete();
                      } else {
                        _controller.nextPage(
                          duration: const Duration(milliseconds: 350),
                          curve: Curves.easeOutCubic,
                        );
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppTheme.s24, vertical: AppTheme.s12),
                      decoration: BoxDecoration(
                        gradient: AppTheme.primaryGradient,
                        borderRadius: BorderRadius.circular(AppTheme.r24),
                        boxShadow: [BoxShadow(
                          color: AppTheme.primary.withValues(alpha: 0.25),
                          blurRadius: 12, offset: const Offset(0, 4),
                        )],
                      ),
                      child: Text(
                        _page == _slides.length - 1
                            ? 'GET STARTED'
                            : 'NEXT',
                        style: AppTheme.button.copyWith(fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Slide {
  final IconData icon;
  final String title;
  final String body;
  const _Slide({required this.icon, required this.title, required this.body});
}
