import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with TickerProviderStateMixin {
  late AnimationController _bgCtrl;
  late AnimationController _entryCtrl;
  late Animation<double> _logoScale;
  late Animation<double> _titleFade;
  late Animation<double> _pillsFade;
  late Animation<double> _btnFade;

  @override
  void initState() {
    super.initState();

    // Subtle background animation
    _bgCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();

    // Staggered entry
    _entryCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    _logoScale = CurvedAnimation(
      parent: _entryCtrl,
      curve: const Interval(0.0, 0.4, curve: Curves.easeOutBack),
    );
    _titleFade = CurvedAnimation(
      parent: _entryCtrl,
      curve: const Interval(0.2, 0.55, curve: Curves.easeOut),
    );
    _pillsFade = CurvedAnimation(
      parent: _entryCtrl,
      curve: const Interval(0.4, 0.75, curve: Curves.easeOut),
    );
    _btnFade = CurvedAnimation(
      parent: _entryCtrl,
      curve: const Interval(0.6, 1.0, curve: Curves.easeOut),
    );

    _entryCtrl.forward();
  }

  @override
  void dispose() {
    _bgCtrl.dispose();
    _entryCtrl.dispose();
    super.dispose();
  }

  void _onStart() {
    HapticFeedback.mediumImpact();
    Navigator.pushNamed(context, '/capture');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        children: [
          AnimatedBuilder(
            animation: _bgCtrl,
            builder: (context, _) {
              return CustomPaint(
                size: MediaQuery.of(context).size,
                painter: _BgPainter(_bgCtrl.value),
              );
            },
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppTheme.s32),
              child: Column(
                children: [
                  // Top nav
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.history, color: AppTheme.textMuted, size: 22),
                        onPressed: () => Navigator.pushNamed(context, '/history'),
                      ),
                      IconButton(
                        icon: const Icon(Icons.info_outline, color: AppTheme.textMuted, size: 22),
                        onPressed: () => Navigator.pushNamed(context, '/about'),
                      ),
                    ],
                  ),
                  const Spacer(flex: 2),
                  ScaleTransition(
                    scale: _logoScale,
                    child: Hero(
                      tag: 'argus_logo',
                      child: ArgusLogo(size: 120),
                    ),
                  ),
                  const SizedBox(height: AppTheme.s24),
                  FadeTransition(
                    opacity: _titleFade,
                    child: Column(
                      children: [
                        Text('ARGUS', style: GoogleFonts.outfit(
                          color: AppTheme.textPrimary, fontSize: 38,
                          fontWeight: FontWeight.w800, letterSpacing: 12,
                        )),
                        const SizedBox(height: AppTheme.s8),
                        Text('Proof of human presence',
                          style: AppTheme.body.copyWith(fontSize: 14),
                          textAlign: TextAlign.center),
                        const SizedBox(height: AppTheme.s4),
                        Text('Verification using heartbeat, behavior, and AI',
                          style: AppTheme.mono.copyWith(
                            fontSize: 10,
                            color: AppTheme.textMuted.withValues(alpha: 0.7),
                          ),
                          textAlign: TextAlign.center),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppTheme.s40),
                  FadeTransition(
                    opacity: _pillsFade,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, 0.15), end: Offset.zero,
                      ).animate(_pillsFade),
                      child: Column(children: [
                        _FeatureRow(Icons.favorite_border, 'Heartbeat detection via rPPG'),
                        const SizedBox(height: AppTheme.s8),
                        _FeatureRow(Icons.psychology_outlined, 'Behavioral analysis'),
                        const SizedBox(height: AppTheme.s8),
                        _FeatureRow(Icons.verified_user_outlined, 'Challenge-response verification'),
                      ]),
                    ),
                  ),
                  const Spacer(flex: 3),
                  FadeTransition(
                    opacity: _btnFade,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, 0.3), end: Offset.zero,
                      ).animate(_btnFade),
                      child: _GlowButton(label: 'START VERIFICATION', onTap: _onStart),
                    ),
                  ),
                  const SizedBox(height: AppTheme.s24),
                  FadeTransition(
                    opacity: _btnFade,
                    child: Text(
                      'Powered by rPPG · Google Cloud · ML Kit',
                      style: AppTheme.mono.copyWith(
                        color: AppTheme.textMuted.withValues(alpha: 0.5), fontSize: 10),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: AppTheme.s16),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Feature Row ───
class _FeatureRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _FeatureRow(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: AppTheme.s16, vertical: AppTheme.s12),
      decoration: BoxDecoration(
        color: AppTheme.surface.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(AppTheme.r12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.04)),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.accent, size: 20),
          const SizedBox(width: AppTheme.s12),
          Text(text, style: AppTheme.bodySmall),
        ],
      ),
    );
  }
}

// ─── Glowing CTA Button ───
class _GlowButton extends StatefulWidget {
  final String label;
  final VoidCallback onTap;
  const _GlowButton({required this.label, required this.onTap});

  @override
  State<_GlowButton> createState() => _GlowButtonState();
}

class _GlowButtonState extends State<_GlowButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _glow;
  bool _pressed = false;

  @override
  void initState() {
    super.initState();
    _glow = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _glow.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _glow,
      builder: (context, child) {
        final g = _glow.value;
        return GestureDetector(
          onTapDown: (_) => setState(() => _pressed = true),
          onTapUp: (_) {
            setState(() => _pressed = false);
            widget.onTap();
          },
          onTapCancel: () => setState(() => _pressed = false),
          child: AnimatedScale(
            scale: _pressed ? 0.96 : 1.0,
            duration: const Duration(milliseconds: 100),
            child: Container(
              width: double.infinity,
              height: 56,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppTheme.r32),
                gradient: AppTheme.primaryGradient,
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.25 + g * 0.15),
                    blurRadius: 16 + g * 10,
                    offset: const Offset(0, 4),
                    spreadRadius: g * 2,
                  ),
                ],
              ),
              alignment: Alignment.center,
              child: Text(widget.label, style: AppTheme.button),
            ),
          ),
        );
      },
    );
  }
}

// ─── Animated Background Painter ───
class _BgPainter extends CustomPainter {
  final double t;
  _BgPainter(this.t);

  @override
  void paint(Canvas canvas, Size size) {
    // Slow-moving gradient orbs
    final p1 = Offset(
      size.width * (0.3 + 0.15 * sin(t * 2 * pi)),
      size.height * (0.25 + 0.1 * cos(t * 2 * pi)),
    );
    final p2 = Offset(
      size.width * (0.7 + 0.1 * cos(t * 2 * pi + 1)),
      size.height * (0.65 + 0.12 * sin(t * 2 * pi + 2)),
    );

    canvas.drawCircle(
      p1,
      size.width * 0.4,
      Paint()
        ..color = AppTheme.primary.withValues(alpha: 0.04)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 80),
    );
    canvas.drawCircle(
      p2,
      size.width * 0.35,
      Paint()
        ..color = AppTheme.secondary.withValues(alpha: 0.03)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 80),
    );
  }

  @override
  bool shouldRepaint(_BgPainter old) => true;
}
