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
      tag: '01 // PHYSIOLOGICAL',
      icon: Icons.favorite_border,
      title: 'rPPG Hemodynamics',
      body: 'Argus isolates subtle chromatic skin changes using facial photoplethysmography to verify authentic biological heartbeats.',
    ),
    _Slide(
      tag: '02 // REFLEXIVE',
      icon: Icons.psychology_outlined,
      title: 'Behavioral Liveness',
      body: 'Natural ocular blinks and real-time random reflex prompts ensure zero susceptibility to pre-recorded video replays or deepfakes.',
    ),
    _Slide(
      tag: '03 // ZERO-STORAGE',
      icon: Icons.shield_outlined,
      title: 'Zero Data Retention',
      body: 'All verification runs strictly in volatile RAM. No facial videos or raw imagery are ever stored on your device or in browser storage.',
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
                padding: const EdgeInsets.symmetric(horizontal: AppTheme.s20, vertical: AppTheme.s12),
                child: GestureDetector(
                  onTap: _complete,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppTheme.border, width: 1.0),
                      borderRadius: BorderRadius.circular(AppTheme.r2),
                    ),
                    child: Text(
                      'SKIP [ESC]',
                      style: AppTheme.monoBold.copyWith(fontSize: 10, color: AppTheme.textPrimary),
                    ),
                  ),
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
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.s24),
                    child: Center(
                      child: BrutalistCard(
                        padding: const EdgeInsets.all(AppTheme.s24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              slide.tag,
                              style: AppTheme.monoBold.copyWith(fontSize: 11, color: AppTheme.primary),
                            ),
                            const SizedBox(height: AppTheme.s16),
                            Container(
                              width: 54,
                              height: 54,
                              decoration: BoxDecoration(
                                color: AppTheme.surfaceMuted,
                                border: Border.all(color: AppTheme.border, width: 1.5),
                                borderRadius: BorderRadius.circular(AppTheme.r2),
                              ),
                              child: Icon(slide.icon, size: 28, color: AppTheme.textPrimary),
                            ),
                            const SizedBox(height: AppTheme.s20),
                            Text(
                              slide.title,
                              style: AppTheme.headingDisplay.copyWith(fontSize: 32),
                            ),
                            const SizedBox(height: AppTheme.s10),
                            Text(
                              slide.body,
                              style: AppTheme.body,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Dots + button
            Padding(
              padding: const EdgeInsets.fromLTRB(AppTheme.s24, 0, AppTheme.s24, AppTheme.s32),
              child: Row(
                children: [
                  // Step Indicator
                  Row(
                    children: List.generate(_slides.length, (i) {
                      final active = i == _page;
                      return Container(
                        width: active ? 24 : 8,
                        height: 8,
                        margin: const EdgeInsets.only(right: 6),
                        decoration: BoxDecoration(
                          color: active ? AppTheme.border : AppTheme.surfaceMuted,
                          border: Border.all(color: AppTheme.border, width: 1.0),
                          borderRadius: BorderRadius.circular(AppTheme.r2),
                        ),
                      );
                    }),
                  ),
                  const Spacer(),
                  // Next / Get Started
                  BrutalistButton(
                    label: _page == _slides.length - 1 ? 'GET STARTED' : 'NEXT',
                    fullWidth: false,
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      if (_page == _slides.length - 1) {
                        _complete();
                      } else {
                        _controller.nextPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOutCubic,
                        );
                      }
                    },
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
  final String tag;
  final IconData icon;
  final String title;
  final String body;
  const _Slide({required this.tag, required this.icon, required this.title, required this.body});
}
