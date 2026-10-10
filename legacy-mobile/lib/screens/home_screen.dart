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
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: IntrinsicHeight(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppTheme.s20, vertical: AppTheme.s16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // ─── Top Bar: Brand & System State ───
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      color: _backendOnline ? AppTheme.success : AppTheme.warning,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: AppTheme.s8),
                                  Flexible(
                                    child: Text(
                                      _isChecking
                                          ? 'CONNECTING'
                                          : (_backendOnline ? 'SYSTEM READY' : 'LOCAL MODE'),
                                      style: AppTheme.monoBold.copyWith(
                                        fontSize: 10,
                                        letterSpacing: 0.8,
                                        color: _backendOnline ? AppTheme.success : AppTheme.textMuted,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
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
                                  icon: const Icon(Icons.tune_outlined, color: AppTheme.textPrimary, size: 20),
                                  tooltip: 'Configure Server',
                                  onPressed: _showServerConfig,
                                ),
                                IconButton(
                                  visualDensity: VisualDensity.compact,
                                  padding: const EdgeInsets.all(4),
                                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                  icon: const Icon(Icons.history, color: AppTheme.textPrimary, size: 20),
                                  tooltip: 'History',
                                  onPressed: () => Navigator.pushNamed(context, '/history'),
                                ),
                                IconButton(
                                  visualDensity: VisualDensity.compact,
                                  padding: const EdgeInsets.all(4),
                                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                  icon: const Icon(Icons.info_outline, color: AppTheme.textPrimary, size: 20),
                                  tooltip: 'About',
                                  onPressed: () => Navigator.pushNamed(context, '/about'),
                                ),
                              ],
                            ),
                          ],
                        ),

                        const Spacer(flex: 2),

                        // ─── Minimalist Biometric Viewfinder Graphic ───
                        Container(
                          width: 130,
                          height: 130,
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            border: Border.all(color: AppTheme.border, width: 2.0),
                            borderRadius: BorderRadius.circular(AppTheme.r4),
                            boxShadow: AppTheme.hardShadowSmall,
                          ),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Positioned(
                                top: 8,
                                left: 8,
                                child: Text('┌', style: AppTheme.mono.copyWith(fontSize: 14, color: AppTheme.primary)),
                              ),
                              Positioned(
                                top: 8,
                                right: 8,
                                child: Text('┐', style: AppTheme.mono.copyWith(fontSize: 14, color: AppTheme.primary)),
                              ),
                              Positioned(
                                bottom: 8,
                                left: 8,
                                child: Text('└', style: AppTheme.mono.copyWith(fontSize: 14, color: AppTheme.primary)),
                              ),
                              Positioned(
                                bottom: 8,
                                right: 8,
                                child: Text('┘', style: AppTheme.mono.copyWith(fontSize: 14, color: AppTheme.primary)),
                              ),
                              Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.face_retouching_natural_outlined,
                                    size: 44,
                                    color: AppTheme.primary,
                                  ),
                                  const SizedBox(height: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppTheme.surfaceLight,
                                      border: Border.all(color: AppTheme.borderSoft),
                                      borderRadius: BorderRadius.circular(AppTheme.r2),
                                    ),
                                    child: Text(
                                      'PASSIVE LIVENESS',
                                      style: AppTheme.monoBold.copyWith(fontSize: 8, color: AppTheme.textMuted),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: AppTheme.s20),

                        // ─── Hero Title & Simple Purpose ───
                        Text(
                          'ARGUS',
                          style: AppTheme.headingDisplay.copyWith(
                            fontSize: 38,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: AppTheme.s4),
                        Text(
                          'Proof of Human Presence',
                          style: AppTheme.heading2.copyWith(
                            fontSize: 16,
                            fontStyle: FontStyle.italic,
                            fontWeight: FontWeight.w400,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: AppTheme.s10),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: AppTheme.s8),
                          child: Text(
                            'Quick 5-second camera verification.\nNo facial data or photos are ever stored.',
                            style: AppTheme.body.copyWith(
                              fontSize: 13,
                              color: AppTheme.textSecondary,
                              height: 1.4,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),

                        const SizedBox(height: AppTheme.s16),

                        // ─── 3 Clean Feature Chips (Wrap prevents any overflow) ───
                        Wrap(
                          alignment: WrapAlignment.center,
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            _buildCleanChip(Icons.flash_on_outlined, '5s Scan'),
                            _buildCleanChip(Icons.lock_outline, 'Zero Storage'),
                            _buildCleanChip(Icons.verified_outlined, 'Anti-Spoof'),
                          ],
                        ),

                        const Spacer(flex: 3),

                        // ─── Primary Action ───
                        BrutalistButton(
                          label: 'VERIFY IDENTITY',
                          icon: Icons.camera_alt_outlined,
                          onPressed: _onStart,
                        ),

                        const SizedBox(height: AppTheme.s14),

                        // ─── Minimal Footnote ───
                        GestureDetector(
                          onTap: _showServerConfig,
                          child: Text(
                            'ENDPOINT: ${ApiConfig.baseUrl.replaceFirst('http://', '')}',
                            style: AppTheme.mono.copyWith(fontSize: 10, color: AppTheme.textMuted),
                          ),
                        ),
                        const SizedBox(height: AppTheme.s6),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildCleanChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        border: Border.all(color: AppTheme.border, width: 1.5),
        borderRadius: BorderRadius.circular(AppTheme.r2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: AppTheme.primary),
          const SizedBox(width: 4),
          Text(
            label,
            style: AppTheme.monoBold.copyWith(fontSize: 9.5, color: AppTheme.textPrimary),
          ),
        ],
      ),
    );
  }
}
