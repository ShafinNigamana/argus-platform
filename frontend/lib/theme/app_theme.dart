import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Argus Design System — every value is intentional.
class AppTheme {
  AppTheme._();

  // ─── Core Palette ───
  static const Color background = Color(0xFF0A0E17);
  static const Color surface = Color(0xFF141B2D);
  static const Color surfaceLight = Color(0xFF1A2340);

  static const Color primary = Color(0xFF6C63FF);     // Electric Indigo
  static const Color primaryLight = Color(0xFF8B83FF);
  static const Color secondary = Color(0xFF00D9FF);    // Cyan
  static const Color accent = Color(0xFF36F1CD);       // Mint

  static const Color success = Color(0xFF00E676);
  static const Color error = Color(0xFFFF4C5E);
  static const Color warning = Color(0xFFFFB74D);

  static const Color textPrimary = Color(0xFFF0F0F5);
  static const Color textSecondary = Color(0xFF8892B0);
  static const Color textMuted = Color(0xFF4A5568);

  // ─── Spacing Scale ───
  static const double s4 = 4;
  static const double s8 = 8;
  static const double s12 = 12;
  static const double s16 = 16;
  static const double s20 = 20;
  static const double s24 = 24;
  static const double s32 = 32;
  static const double s40 = 40;
  static const double s48 = 48;
  static const double s64 = 64;

  // ─── Radius Scale ───
  static const double r8 = 8;
  static const double r12 = 12;
  static const double r16 = 16;
  static const double r24 = 24;
  static const double r32 = 32;

  // ─── Typography ───
  static TextStyle heading1 = GoogleFonts.outfit(
    fontSize: 32, fontWeight: FontWeight.w700, color: textPrimary, height: 1.2,
  );
  static TextStyle heading2 = GoogleFonts.outfit(
    fontSize: 24, fontWeight: FontWeight.w600, color: textPrimary, height: 1.3,
  );
  static TextStyle heading3 = GoogleFonts.outfit(
    fontSize: 18, fontWeight: FontWeight.w600, color: textPrimary,
  );
  static TextStyle body = GoogleFonts.inter(
    fontSize: 15, fontWeight: FontWeight.w400, color: textSecondary, height: 1.5,
  );
  static TextStyle bodySmall = GoogleFonts.inter(
    fontSize: 13, fontWeight: FontWeight.w400, color: textSecondary,
  );
  static TextStyle label = GoogleFonts.inter(
    fontSize: 14, fontWeight: FontWeight.w600, color: textPrimary, letterSpacing: 1.2,
  );
  static TextStyle button = GoogleFonts.inter(
    fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 1.5,
  );
  static TextStyle mono = GoogleFonts.jetBrainsMono(
    fontSize: 13, fontWeight: FontWeight.w500, color: textSecondary,
  );

  // ─── Gradients ───
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primary, Color(0xFF4A3AFF)],
  );

  static const LinearGradient glowGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x336C63FF), Color(0x00000000)],
  );

  static LinearGradient fadeToBlack = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.transparent, background.withValues(alpha: 0.9), background],
    stops: const [0.0, 0.5, 1.0],
  );

  // ─── Theme Data ───
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: secondary,
        surface: surface,
        error: error,
      ),
      useMaterial3: true,
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  REUSABLE PREMIUM WIDGETS
// ═══════════════════════════════════════════════════════════════

/// Glassmorphic card with frosted blur.
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final double borderRadius;
  final Color? borderColor;

  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppTheme.s16),
    this.borderRadius = AppTheme.r16,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: AppTheme.surface.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: borderColor ?? Colors.white.withValues(alpha: 0.06),
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

/// Pulsing glow ring — for face alignment guide.
class PulseRing extends StatefulWidget {
  final double size;
  final Color color;
  final bool active;
  final Widget? child;

  const PulseRing({
    super.key,
    required this.size,
    this.color = AppTheme.primary,
    this.active = true,
    this.child,
  });

  @override
  State<PulseRing> createState() => _PulseRingState();
}

class _PulseRingState extends State<PulseRing>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        final pulse = widget.active ? _ctrl.value : 0.0;
        return Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: widget.color.withValues(alpha: 0.15 + pulse * 0.15),
                blurRadius: 20 + pulse * 20,
                spreadRadius: pulse * 8,
              ),
            ],
          ),
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: widget.color.withValues(alpha: 0.4 + pulse * 0.4),
                width: 2,
              ),
            ),
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

/// Shimmer loading bar.
class ShimmerBar extends StatefulWidget {
  final double value; // 0.0 – 1.0
  final double height;
  final Color color;
  final Color? backgroundColor;

  const ShimmerBar({
    super.key,
    required this.value,
    this.height = 6,
    this.color = AppTheme.primary,
    this.backgroundColor,
  });

  @override
  State<ShimmerBar> createState() => _ShimmerBarState();
}

class _ShimmerBarState extends State<ShimmerBar>
    with SingleTickerProviderStateMixin {
  late AnimationController _shimmer;

  @override
  void initState() {
    super.initState();
    _shimmer = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _shimmer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _shimmer,
      builder: (context, _) {
        return ClipRRect(
          borderRadius: BorderRadius.circular(widget.height / 2),
          child: SizedBox(
            height: widget.height,
            child: Stack(
              children: [
                // Background
                Container(
                  color: widget.backgroundColor ??
                      Colors.white.withValues(alpha: 0.08),
                ),
                // Fill
                FractionallySizedBox(
                  widthFactor: widget.value,
                  child: ShaderMask(
                    shaderCallback: (bounds) {
                      return LinearGradient(
                        begin: Alignment(-1.0 + _shimmer.value * 3, 0),
                        end: Alignment(_shimmer.value * 3, 0),
                        colors: [
                          widget.color,
                          widget.color.withValues(alpha: 0.4),
                          widget.color,
                        ],
                        stops: const [0.0, 0.5, 1.0],
                      ).createShader(bounds);
                    },
                    child: Container(color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Custom page route with fade + slide up.
class ArgusPageRoute<T> extends PageRouteBuilder<T> {
  final Widget page;

  ArgusPageRoute({required this.page})
      : super(
          transitionDuration: const Duration(milliseconds: 400),
          reverseTransitionDuration: const Duration(milliseconds: 300),
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            final curved = CurvedAnimation(
              parent: animation,
              curve: Curves.easeOutCubic,
            );
            return FadeTransition(
              opacity: curved,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 0.04),
                  end: Offset.zero,
                ).animate(curved),
                child: child,
              ),
            );
          },
        );
}

/// Score arc painter for the result screen.
class ScoreArcPainter extends CustomPainter {
  final double progress; // 0.0 – 1.0
  final Color color;
  final double strokeWidth;

  ScoreArcPainter({
    required this.progress,
    required this.color,
    this.strokeWidth = 8,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.shortestSide - strokeWidth) / 2;

    // Track
    final trackPaint = Paint()
      ..color = color.withValues(alpha: 0.1)
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, trackPaint);

    // Arc
    if (progress > 0) {
      final arcPaint = Paint()
        ..shader = SweepGradient(
          startAngle: -1.5708,
          endAngle: -1.5708 + 6.2832 * progress,
          colors: [color.withValues(alpha: 0.6), color],
        ).createShader(Rect.fromCircle(center: center, radius: radius))
        ..strokeWidth = strokeWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -1.5708, // Start from top
        6.2832 * progress,
        false,
        arcPaint,
      );

      // Glow dot at end
      final angle = -1.5708 + 6.2832 * progress;
      final dotCenter = Offset(
        center.dx + radius * cos(angle),
        center.dy + radius * sin(angle),
      );
      canvas.drawCircle(
        dotCenter,
        strokeWidth / 2 + 2,
        Paint()
          ..color = color.withValues(alpha: 0.3)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
      );
    }
  }

  static double cos(double x) => _cos(x);
  static double sin(double x) => _sin(x);

  // Inline trig to avoid dart:math import in painter
  static double _cos(double x) {
    x = x % 6.283185307;
    double result = 1.0;
    double term = 1.0;
    for (int i = 1; i <= 10; i++) {
      term *= -x * x / ((2 * i - 1) * (2 * i));
      result += term;
    }
    return result;
  }

  static double _sin(double x) {
    x = x % 6.283185307;
    double result = x;
    double term = x;
    for (int i = 1; i <= 10; i++) {
      term *= -x * x / ((2 * i) * (2 * i + 1));
      result += term;
    }
    return result;
  }

  @override
  bool shouldRepaint(ScoreArcPainter oldDelegate) =>
      progress != oldDelegate.progress || color != oldDelegate.color;
}

/// Argus brand logo — eye + pulse waveform.
/// Reusable across Home, Result, and any screen.
class ArgusLogo extends StatelessWidget {
  final double size;
  final Color? color;
  const ArgusLogo({super.key, this.size = 48, this.color});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size * 0.6),
      painter: _ArgusLogoPainter(color ?? AppTheme.primary),
    );
  }
}

class _ArgusLogoPainter extends CustomPainter {
  final Color color;
  _ArgusLogoPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final cy = h * 0.5;

    // Eye shape (two arcs)
    final eyePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.04
      ..strokeCap = StrokeCap.round;

    // Top arc of eye
    final topPath = Path()
      ..moveTo(w * 0.05, cy)
      ..quadraticBezierTo(w * 0.5, cy - h * 0.6, w * 0.95, cy);
    canvas.drawPath(topPath, eyePaint);

    // Bottom arc of eye
    final bottomPath = Path()
      ..moveTo(w * 0.05, cy)
      ..quadraticBezierTo(w * 0.5, cy + h * 0.6, w * 0.95, cy);
    canvas.drawPath(bottomPath, eyePaint);

    // Iris (circle)
    canvas.drawCircle(
      Offset(w * 0.5, cy),
      w * 0.12,
      Paint()..color = color.withValues(alpha: 0.9)..style = PaintingStyle.fill,
    );

    // Pulse line through the iris
    final pulsePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = w * 0.03
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final pulsePath = Path()
      ..moveTo(w * 0.25, cy)
      ..lineTo(w * 0.40, cy)
      ..lineTo(w * 0.44, cy - h * 0.22)
      ..lineTo(w * 0.50, cy + h * 0.18)
      ..lineTo(w * 0.54, cy - h * 0.12)
      ..lineTo(w * 0.58, cy)
      ..lineTo(w * 0.75, cy);
    canvas.drawPath(pulsePath, pulsePaint);
  }

  @override
  bool shouldRepaint(_ArgusLogoPainter old) => color != old.color;
}

/// Confidence level derived from liveness score.
enum Confidence { high, medium, low }

Confidence getConfidence(double score) {
  if (score >= 75) return Confidence.high;
  if (score >= 50) return Confidence.medium;
  return Confidence.low;
}

Color getConfidenceColor(Confidence c) {
  switch (c) {
    case Confidence.high: return AppTheme.success;
    case Confidence.medium: return AppTheme.warning;
    case Confidence.low: return AppTheme.error;
  }
}

String getConfidenceLabel(Confidence c) {
  switch (c) {
    case Confidence.high: return 'HIGH';
    case Confidence.medium: return 'MEDIUM';
    case Confidence.low: return 'LOW';
  }
}

