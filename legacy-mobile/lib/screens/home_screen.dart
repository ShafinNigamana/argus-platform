import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_config.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _apiService = ApiService();
  bool _backendOnline = false;
  bool _isChecking = true;

  @override
  void initState() {
    super.initState();
    _checkBackendHealth();
  }

  Future<void> _checkBackendHealth() async {
    setState(() => _isChecking = true);
    final health = await _apiService.checkHealth();
    if (mounted) {
      setState(() {
        _backendOnline = health != null;
        _isChecking = false;
      });
    }
  }

  void _onStart() {
    HapticFeedback.mediumImpact();
    Navigator.pushNamed(context, '/capture');
  }

  void _showServerConfig() {
    final controller = TextEditingController(text: ApiConfig.baseUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTheme.r4),
          side: const BorderSide(color: AppTheme.border, width: 2.0),
        ),
        title: Text(
          'SERVER CONFIGURATION',
          style: AppTheme.monoBold.copyWith(fontSize: 14),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Target Spring Boot Endpoint:',
              style: AppTheme.bodySmall,
            ),
            const SizedBox(height: AppTheme.s8),
            TextField(
              controller: controller,
              style: AppTheme.mono,
              decoration: InputDecoration(
                filled: true,
                fillColor: AppTheme.surfaceLight,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.r2),
                  borderSide: const BorderSide(color: AppTheme.border, width: 1.5),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: AppTheme.s8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ActionChip(
                  label: Text('USB (localhost)', style: AppTheme.mono.copyWith(fontSize: 10)),
                  backgroundColor: AppTheme.surfaceLight,
                  onPressed: () => controller.text = 'http://localhost:8080',
                ),
                ActionChip(
                  label: Text('LAN (Wi-Fi)', style: AppTheme.mono.copyWith(fontSize: 10)),
                  backgroundColor: AppTheme.surfaceLight,
                  onPressed: () => controller.text = 'http://192.168.0.101:8080',
                ),
                ActionChip(
                  label: Text('Emulator', style: AppTheme.mono.copyWith(fontSize: 10)),
                  backgroundColor: AppTheme.surfaceLight,
                  onPressed: () => controller.text = 'http://10.0.2.2:8080',
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('CANCEL', style: AppTheme.monoBold),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.r2),
              ),
            ),
            onPressed: () {
              ApiConfig.setCustomBaseUrl(controller.text);
              Navigator.pop(ctx);
              _checkBackendHealth();
            },
            child: Text('SAVE', style: AppTheme.monoBold),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.s20, vertical: AppTheme.s16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ─── Editorial Masthead Header ───
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ARGUS PROTOCOL // SGP 2026',
                          style: AppTheme.monoBold.copyWith(
                            fontSize: 10,
                            letterSpacing: 1.2,
                            color: AppTheme.textMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'DEFENSE-GRADE BIOMETRICS',
                          style: AppTheme.mono.copyWith(
                            fontSize: 10,
                            color: AppTheme.textMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppTheme.s8),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        icon: const Icon(Icons.settings_ethernet, color: AppTheme.textPrimary, size: 20),
                        tooltip: 'Configure Backend Server',
                        onPressed: _showServerConfig,
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        icon: const Icon(Icons.history, color: AppTheme.textPrimary, size: 20),
                        tooltip: 'Audit History',
                        onPressed: () => Navigator.pushNamed(context, '/history'),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        icon: const Icon(Icons.info_outline, color: AppTheme.textPrimary, size: 20),
                        tooltip: 'System Specs',
                        onPressed: () => Navigator.pushNamed(context, '/about'),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: AppTheme.s12),
              const EditorialDivider(),
              const SizedBox(height: AppTheme.s16),

              // ─── Hero Section ───
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.circular(AppTheme.r2),
                ),
                child: Text(
                  '● ZERO-KNOWLEDGE LIVENESS PROTOCOL',
                  style: AppTheme.monoBold.copyWith(
                    fontSize: 9,
                    color: Colors.white,
                    letterSpacing: 1.0,
                  ),
                ),
              ),
              const SizedBox(height: AppTheme.s8),
              Text(
                'ARGUS',
                style: AppTheme.headingDisplay.copyWith(
                  fontSize: 48,
                  letterSpacing: -1.0,
                  height: 1.05,
                ),
              ),
              const SizedBox(height: AppTheme.s4),
              Text(
                'Proof of Human Presence.',
                style: AppTheme.heading2.copyWith(
                  fontSize: 20,
                  fontStyle: FontStyle.italic,
                  fontWeight: FontWeight.w400,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: AppTheme.s8),
              Text(
                'Autonomous verification uniting passive sub-dermal hemodynamic rPPG blood volume pulse tracking and spontaneous behavioral dynamics without storing biometric artifacts.',
                style: AppTheme.bodySmall.copyWith(
                  fontSize: 12,
                  color: AppTheme.textSecondary,
                  height: 1.45,
                ),
              ),

              const SizedBox(height: AppTheme.s16),

              // ─── Live Telemetry Card ───
              BrutalistCard(
                padding: const EdgeInsets.all(AppTheme.s16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: _backendOnline ? AppTheme.success : AppTheme.error,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: AppTheme.s8),
                            Text(
                              _isChecking
                                  ? 'PROBING TELEMETRY...'
                                  : (_backendOnline ? 'BACKEND: ONLINE' : 'BACKEND: OFFLINE'),
                              style: AppTheme.monoBold.copyWith(
                                fontSize: 11,
                                color: _backendOnline ? AppTheme.success : AppTheme.error,
                              ),
                            ),
                          ],
                        ),
                        InkWell(
                          onTap: _showServerConfig,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.surfaceMuted,
                              border: Border.all(color: AppTheme.border, width: 1.0),
                              borderRadius: BorderRadius.circular(AppTheme.r2),
                            ),
                            child: Text(
                              'CONFIGURE',
                              style: AppTheme.monoBold.copyWith(fontSize: 9, color: AppTheme.textPrimary),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppTheme.s10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceLight,
                        border: Border.all(color: AppTheme.borderSoft),
                        borderRadius: BorderRadius.circular(AppTheme.r2),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.link, size: 14, color: AppTheme.textMuted),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              ApiConfig.baseUrl,
                              style: AppTheme.mono.copyWith(fontSize: 11, color: AppTheme.textPrimary),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppTheme.s10),
                    Row(
                      children: [
                        Expanded(
                          child: _buildTelemetryStat('ENGINE', 'rPPG 30FPS'),
                        ),
                        const SizedBox(width: AppTheme.s8),
                        Expanded(
                          child: _buildTelemetryStat('TRACKER', 'FACEMESH'),
                        ),
                        const SizedBox(width: AppTheme.s8),
                        Expanded(
                          child: _buildTelemetryStat('STORAGE', 'EPHEMERAL'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.s16),
              const EditorialDivider(label: 'MULTI-SIGNAL DEFENSE SPEC'),
              const SizedBox(height: AppTheme.s12),

              // ─── 3 Defense Pillars ───
              _buildFeatureCard(
                index: '01',
                title: 'HEMODYNAMIC rPPG',
                badge: 'PASSIVE PULSE',
                description: 'Extracts real-time sub-dermal blood volume pulse from facial micro-chrominance (0.75 - 2.50 Hz cardiac bandpass).',
                icon: Icons.favorite_border,
              ),
              const SizedBox(height: AppTheme.s10),
              _buildFeatureCard(
                index: '02',
                title: 'BEHAVIORAL KINEMATICS',
                badge: 'ACTIVE LIVENESS',
                description: 'Monitors involuntary ocular blinks, 3D head saccadic motion & random challenge reaction latency.',
                icon: Icons.remove_red_eye_outlined,
              ),
              const SizedBox(height: AppTheme.s10),
              _buildFeatureCard(
                index: '03',
                title: 'ZERO-STORAGE PRIVACY',
                badge: 'KMS SIGNED',
                description: 'Video frames are strictly processed in-memory and discarded. Non-repudiation ledger signed via Ed25519.',
                icon: Icons.lock_outline,
              ),

              const SizedBox(height: AppTheme.s20),

              // ─── Primary Call To Action ───
              BrutalistButton(
                label: 'VERIFY IDENTITY',
                icon: Icons.fingerprint,
                onPressed: _onStart,
              ),

              const SizedBox(height: AppTheme.s10),

              // ─── Secondary Quick Links ───
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.textPrimary,
                        backgroundColor: AppTheme.surface,
                        side: const BorderSide(color: AppTheme.border, width: 1.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppTheme.r2),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () => Navigator.pushNamed(context, '/history'),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.history, size: 14),
                          const SizedBox(width: 6),
                          Text('AUDIT LOGS', style: AppTheme.monoBold.copyWith(fontSize: 10)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: AppTheme.s8),
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.textPrimary,
                        backgroundColor: AppTheme.surface,
                        side: const BorderSide(color: AppTheme.border, width: 1.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppTheme.r2),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () => Navigator.pushNamed(context, '/about'),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.description_outlined, size: 14),
                          const SizedBox(width: 6),
                          Text('SYSTEM SPECS', style: AppTheme.monoBold.copyWith(fontSize: 10)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: AppTheme.s16),
              Center(
                child: Text(
                  'ISO/IEC 30107-3 LIVENESS STANDARDS COMPLIANT',
                  style: AppTheme.mono.copyWith(fontSize: 9, color: AppTheme.textMuted, letterSpacing: 0.5),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: AppTheme.s8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTelemetryStat(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.surfaceLight,
        border: Border.all(color: AppTheme.borderSoft),
        borderRadius: BorderRadius.circular(AppTheme.r2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTheme.mono.copyWith(fontSize: 9, color: AppTheme.textMuted),
          ),
          const SizedBox(height: 1),
          Text(
            value,
            style: AppTheme.monoBold.copyWith(fontSize: 10, color: AppTheme.textPrimary),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureCard({
    required String index,
    required String title,
    required String badge,
    required String description,
    required IconData icon,
  }) {
    return BrutalistCard(
      padding: const EdgeInsets.all(AppTheme.s12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppTheme.surfaceLight,
              border: Border.all(color: AppTheme.border, width: 1.5),
              borderRadius: BorderRadius.circular(AppTheme.r2),
            ),
            child: Center(
              child: Icon(icon, size: 16, color: AppTheme.primary),
            ),
          ),
          const SizedBox(width: AppTheme.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        '$index // $title',
                        style: AppTheme.monoBold.copyWith(fontSize: 11, color: AppTheme.textPrimary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceMuted,
                        border: Border.all(color: AppTheme.borderSoft),
                        borderRadius: BorderRadius.circular(AppTheme.r2),
                      ),
                      child: Text(
                        badge,
                        style: AppTheme.mono.copyWith(fontSize: 8, color: AppTheme.primary, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: AppTheme.bodySmall.copyWith(fontSize: 11, color: AppTheme.textSecondary, height: 1.35),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
