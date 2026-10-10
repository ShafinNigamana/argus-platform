import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Argus Neo-Brutalist & Editorial Design System
/// Derived from web token architecture (Instrument Serif + IBM Plex Sans/Mono)
class AppTheme {
  AppTheme._();

  // ─── Editorial Neo-Brutalist Palette (Paper & Ink) ───
  static const Color background = Color(0xFFEEEBE3);      // Bone Paper
  static const Color surface = Color(0xFFF7F5EF);         // Off-White Ivory Card
  static const Color surfaceLight = Color(0xFFFFFFFF);    // Pure White Card
  static const Color surfaceMuted = Color(0xFFE5E1D8);    // Recessed Panel

  static const Color ink = Color(0xFF14130F);             // Deep Carbon Ink
  static const Color border = Color(0xFF14130F);          // Hard Stroke Line
  static const Color borderSoft = Color(0xFFCFCABB);      // Subtle Hairline Divider

  static const Color primary = Color(0xFF2B3FE0);         // Electric Cobalt (Argus Blue)
  static const Color primaryLight = Color(0xFF4F62FF);
  static const Color secondary = Color(0xFF14130F);       // Monolith Charcoal
  static const Color accent = Color(0xFF2B3FE0);          // Primary Action Accent

  static const Color success = Color(0xFF1E6B47);         // Forest Green (Verified)
  static const Color error = Color(0xFFB3261E);           // Crimson (Spoof Detected)
  static const Color warning = Color(0xFFA86A0C);         // Amber (Caution)

  static const Color textPrimary = Color(0xFF14130F);     // High-Contrast Ink
  static const Color textSecondary = Color(0xFF6B675C);   // Editorial Muted Lead
  static const Color textMuted = Color(0xFF8C877B);       // Fine-print Metadata

  // Dark variant tokens
  static const Color darkBackground = Color(0xFF13120F);
  static const Color darkSurface = Color(0xFF1B1A16);
  static const Color darkInk = Color(0xFFECE8DC);
  static const Color darkBorder = Color(0xFFECE8DC);
  static const Color darkTextMuted = Color(0xFF9A9585);

  // ─── Spacing Scale ───
  static const double s2 = 2;
  static const double s4 = 4;
  static const double s6 = 6;
  static const double s8 = 8;
  static const double s10 = 10;
  static const double s12 = 12;
  static const double s14 = 14;
  static const double s16 = 16;
  static const double s20 = 20;
  static const double s24 = 24;
  static const double s32 = 32;
  static const double s40 = 40;
  static const double s48 = 48;
  static const double s64 = 64;

  // ─── Crisp Brutalist Radius Scale ───
  static const double r0 = 0;
  static const double r2 = 2;
  static const double r4 = 4;
  static const double r8 = 8;
  static const double r12 = 12;
  static const double r16 = 16;
  static const double r24 = 24;
  static const double r32 = 32;

  // ─── Neo-Brutalist Hard Drop Shadows ───
  static const List<BoxShadow> hardShadow = [
    BoxShadow(
      color: Color(0xFF14130F),
      offset: Offset(3, 3),
      blurRadius: 0,
      spreadRadius: 0,
    ),
  ];

  static const List<BoxShadow> hardShadowSmall = [
    BoxShadow(
      color: Color(0xFF14130F),
      offset: Offset(2, 2),
      blurRadius: 0,
      spreadRadius: 0,
    ),
  ];

  static const List<BoxShadow> hardShadowLarge = [
    BoxShadow(
      color: Color(0xFF14130F),
      offset: Offset(4, 4),
      blurRadius: 0,
      spreadRadius: 0,
    ),
  ];

  // ─── Typography ───
  // Headlines: Editorial Instrument Serif
  static TextStyle headingDisplay = GoogleFonts.instrumentSerif(
    fontSize: 42,
    fontWeight: FontWeight.w400,
    fontStyle: FontStyle.italic,
    color: textPrimary,
    height: 1.05,
    letterSpacing: -0.5,
  );

  static TextStyle heading1 = GoogleFonts.instrumentSerif(
    fontSize: 34,
    fontWeight: FontWeight.w400,
    fontStyle: FontStyle.italic,
    color: textPrimary,
    height: 1.15,
  );

  static TextStyle heading2 = GoogleFonts.instrumentSerif(
    fontSize: 24,
    fontWeight: FontWeight.w400,
    color: textPrimary,
    height: 1.25,
  );

  static TextStyle heading3 = GoogleFonts.ibmPlexSans(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: textPrimary,
  );

  // Body: IBM Plex Sans
  static TextStyle body = GoogleFonts.ibmPlexSans(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: textSecondary,
    height: 1.5,
  );

  static TextStyle bodySmall = GoogleFonts.ibmPlexSans(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: textSecondary,
  );

  // Telemetry & Badges: IBM Plex Mono
  static TextStyle label = GoogleFonts.ibmPlexMono(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: textPrimary,
    letterSpacing: 1.0,
  );

  static TextStyle button = GoogleFonts.ibmPlexMono(
    fontSize: 13,
    fontWeight: FontWeight.w700,
    color: Colors.white,
    letterSpacing: 1.2,
  );

  static TextStyle mono = GoogleFonts.ibmPlexMono(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: textPrimary,
  );

  static TextStyle monoBold = GoogleFonts.ibmPlexMono(
    fontSize: 13,
    fontWeight: FontWeight.w700,
    color: textPrimary,
  );

  // ─── Editorial Lines ───
  static const BorderSide solidBorder = BorderSide(color: border, width: 1.5);
  static const BorderSide thickBorder = BorderSide(color: border, width: 2.0);
  static const BorderSide softBorder = BorderSide(color: borderSoft, width: 1.0);

  // ─── Flutter ThemeData ───
  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: background,
      primaryColor: primary,
      colorScheme: const ColorScheme.light(
        primary: primary,
        secondary: secondary,
        surface: surface,
        error: error,
      ),
      dividerColor: borderSoft,
      textTheme: TextTheme(
        displayLarge: headingDisplay,
        headlineLarge: heading1,
        headlineMedium: heading2,
        titleMedium: heading3,
        bodyLarge: body,
        bodyMedium: bodySmall,
        labelLarge: label,
      ),
      useMaterial3: true,
    );
  }

  // Alias darkTheme to lightTheme for consistent Neo-Brutalist Paper look,
  // or return dedicated high-contrast brutalist styling
  static ThemeData get darkTheme => lightTheme;
}

// ═══════════════════════════════════════════════════════════════
//  NEO-BRUTALIST REUSABLE WIDGETS
// ═══════════════════════════════════════════════════════════════

/// Crisp Brutalist Card with solid black stroke and hard offset drop shadow.
class BrutalistCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final Color backgroundColor;
  final Color borderColor;
  final double borderWidth;
  final double borderRadius;
  final bool hasShadow;
  final VoidCallback? onTap;

  const BrutalistCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppTheme.s16),
    this.backgroundColor = AppTheme.surface,
    this.borderColor = AppTheme.border,
    this.borderWidth = 1.5,
    this.borderRadius = AppTheme.r4,
    this.hasShadow = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Widget card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: borderColor, width: borderWidth),
        boxShadow: hasShadow ? AppTheme.hardShadowSmall : null,
      ),
      child: child,
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: card,
      );
    }
    return card;
  }
}

/// Backward compatibility alias for GlassCard -> modern Brutalist Card
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final double borderRadius;
  final Color? borderColor;

  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppTheme.s16),
    this.borderRadius = AppTheme.r4,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return BrutalistCard(
      padding: padding,
      borderRadius: borderRadius,
      borderColor: borderColor ?? AppTheme.border,
      child: child,
    );
  }
}

/// Neo-Brutalist Action Button with hard offset shadow and active tap state.
class BrutalistButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final Color backgroundColor;
  final Color textColor;
  final Color borderColor;
  final IconData? icon;
  final bool fullWidth;

  const BrutalistButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.backgroundColor = AppTheme.primary,
    this.textColor = Colors.white,
    this.borderColor = AppTheme.border,
    this.icon,
    this.fullWidth = true,
  });

  @override
  State<BrutalistButton> createState() => _BrutalistButtonState();
}

class _BrutalistButtonState extends State<BrutalistButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final double offset = _isPressed ? 0.0 : 3.0;

    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.onPressed,
      child: Container(
        width: widget.fullWidth ? double.infinity : null,
        padding: const EdgeInsets.symmetric(horizontal: AppTheme.s20, vertical: AppTheme.s16),
        decoration: BoxDecoration(
          color: widget.onPressed == null ? AppTheme.surfaceMuted : widget.backgroundColor,
          borderRadius: BorderRadius.circular(AppTheme.r4),
          border: Border.all(color: widget.borderColor, width: 2.0),
          boxShadow: widget.onPressed == null || _isPressed
              ? null
              : [
                  BoxShadow(
                    color: widget.borderColor,
                    offset: Offset(offset, offset),
                    blurRadius: 0,
                  ),
                ],
        ),
        child: Row(
          mainAxisSize: widget.fullWidth ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (widget.icon != null) ...[
              Icon(widget.icon, color: widget.textColor, size: 18),
              const SizedBox(width: AppTheme.s8),
            ],
            Text(
              widget.label.toUpperCase(),
              style: AppTheme.button.copyWith(color: widget.textColor),
            ),
          ],
        ),
      ),
    );
  }
}

/// Monospace Telemetry / Status Pill with colored signal dot.
class StatusBadge extends StatelessWidget {
  final String label;
  final Color dotColor;
  final Color backgroundColor;
  final Color textColor;

  const StatusBadge({
    super.key,
    required this.label,
    this.dotColor = AppTheme.success,
    this.backgroundColor = AppTheme.surface,
    this.textColor = AppTheme.textPrimary,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppTheme.s8, vertical: AppTheme.s4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(AppTheme.r2),
        border: Border.all(color: AppTheme.border, width: 1.0),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: dotColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: AppTheme.s6),
          Text(
            label.toUpperCase(),
            style: AppTheme.monoBold.copyWith(fontSize: 10, color: textColor),
          ),
        ],
      ),
    );
  }
}

/// Technical Section Divider with optional label
class EditorialDivider extends StatelessWidget {
  final String? label;
  const EditorialDivider({super.key, this.label});

  @override
  Widget build(BuildContext context) {
    if (label == null) {
      return Container(
        height: 1.5,
        color: AppTheme.border,
      );
    }
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.only(right: AppTheme.s8),
          child: Text(
            label!.toUpperCase(),
            style: AppTheme.monoBold.copyWith(fontSize: 11, color: AppTheme.textMuted),
          ),
        ),
        Expanded(
          child: Container(
            height: 1.5,
            color: AppTheme.border,
          ),
        ),
      ],
    );
  }
}

/// Pulse Ring for biometric face tracking (Brutalist corner bracket style)
class PulseRing extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final c = child;
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              border: Border.all(
                color: active ? color : AppTheme.borderSoft,
                width: 2.0,
              ),
              borderRadius: BorderRadius.circular(AppTheme.r4),
            ),
          ),
          ?c,
        ],
      ),
    );
  }
}

/// Progress / Shimmer Bar (Solid Brutalist Fill)
class ShimmerBar extends StatelessWidget {
  final double value; // 0.0 – 1.0
  final double height;
  final Color color;
  final Color? backgroundColor;

  const ShimmerBar({
    super.key,
    required this.value,
    this.height = 8,
    this.color = AppTheme.primary,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: backgroundColor ?? AppTheme.surfaceMuted,
        border: Border.all(color: AppTheme.border, width: 1.5),
        borderRadius: BorderRadius.circular(AppTheme.r2),
      ),
      child: FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: value.clamp(0.0, 1.0),
        child: Container(
          color: color,
        ),
      ),
    );
  }
}

/// Score Arc / Progress Painter (Brutalist dial)
class ScoreArcPainter extends CustomPainter {
  final double progress; // 0.0 – 1.0
  final Color color;
  final double strokeWidth;

  ScoreArcPainter({
    required this.progress,
    required this.color,
    this.strokeWidth = 10,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.shortestSide - strokeWidth) / 2;

    // Track
    final trackPaint = Paint()
      ..color = AppTheme.surfaceMuted
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(center, radius, trackPaint);

    // Track outline
    final outlinePaint = Paint()
      ..color = AppTheme.border
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(center, radius + (strokeWidth / 2), outlinePaint);
    canvas.drawCircle(center, radius - (strokeWidth / 2), outlinePaint);

    // Progress Arc
    if (progress > 0) {
      final arcPaint = Paint()
        ..color = color
        ..strokeWidth = strokeWidth
        ..style = PaintingStyle.stroke;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -1.5708, // Start top
        6.28318 * progress,
        false,
        arcPaint,
      );
    }
  }

  @override
  bool shouldRepaint(ScoreArcPainter oldDelegate) =>
      progress != oldDelegate.progress || color != oldDelegate.color;
}

/// Brand Logo Widget
class ArgusLogo extends StatelessWidget {
  final double size;
  final Color? color;
  final bool showGlow;
  const ArgusLogo({super.key, this.size = 48, this.color, this.showGlow = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppTheme.surface,
        border: Border.all(color: AppTheme.border, width: 2.0),
        borderRadius: BorderRadius.circular(AppTheme.r4),
        boxShadow: AppTheme.hardShadowSmall,
      ),
      child: Center(
        child: Image.asset(
          'assets/logo/argus_logo.png',
          width: size * 0.8,
          height: size * 0.8,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => Icon(
            Icons.shield_outlined,
            size: size * 0.6,
            color: AppTheme.primary,
          ),
        ),
      ),
    );
  }
}

/// Confidence enum & helpers
enum Confidence { high, medium, low }

Confidence getConfidence(double score) {
  if (score >= 75) return Confidence.high;
  if (score >= 50) return Confidence.medium;
  return Confidence.low;
}

Color getConfidenceColor(Confidence c) {
  switch (c) {
    case Confidence.high:
      return AppTheme.success;
    case Confidence.medium:
      return AppTheme.warning;
    case Confidence.low:
      return AppTheme.error;
  }
}

String getConfidenceLabel(Confidence c) {
  switch (c) {
    case Confidence.high:
      return 'HIGH';
    case Confidence.medium:
      return 'MEDIUM';
    case Confidence.low:
      return 'LOW';
  }
}
