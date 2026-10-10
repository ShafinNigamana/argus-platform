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
          padding: const EdgeInsets.symmetric(horizontal: AppTheme.s24, vertical: AppTheme.s16),
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
                          'ARGUS BIOMETRIC VERIFICATION',
                          style: AppTheme.monoBold.copyWith(
                            fontSize: 10,
                            letterSpacing: 1.1,
                            color: AppTheme.textMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'RELEASE // SGP 2026',
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
                        onPressed: () => Navigator.pushNamed(context, '/history'),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        icon: const Icon(Icons.info_outline, color: AppTheme.textPrimary, size: 20),
                        onPressed: () => Navigator.pushNamed(context, '/about'),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: AppTheme.s12),
              const EditorialDivider(),
              const SizedBox(height: AppTheme.s20),

              // ─── Status Ribbon ───
              Row(
                children: [
                  StatusBadge(
                    label: _isChecking
                        ? 'CONNECTING...'
                        : (_backendOnline ? 'BACKEND: ONLINE' : 'BACKEND: OFFLINE'),
                    dotColor: _isChecking
                        ? AppTheme.warning
                        : (_backendOnline ? AppTheme.success : AppTheme.error),
                  ),
                  const SizedBox(width: AppTheme.s8),
                  Expanded(
                    child: Text(
                      ApiConfig.baseUrl.replaceFirst('http://', ''),
                      style: AppTheme.mono.copyWith(fontSize: 11, color: AppTheme.textMuted),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: AppTheme.s20),

              // ─── Title & Brand Identity ───
              Center(
                child: Column(
                  children: [
                    Text(
                      'ARGUS',
                      style: AppTheme.headingDisplay,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppTheme.s4),
                    Text(
                      'Autonomous Proof of Human Presence',
                      style: AppTheme.heading3.copyWith(
                        fontSize: 15,
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppTheme.s8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceMuted,
                        borderRadius: BorderRadius.circular(AppTheme.r2),
                        border: Border.all(color: AppTheme.borderSoft),
                      ),
                      child: Text(
                        'PASSIVE rPPG + BEHAVIORAL INTEL + ZERO-STORAGE',
                        style: AppTheme.mono.copyWith(fontSize: 10, color: AppTheme.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.s20),

              // ─── Defense Pipeline Spec Card ───
              BrutalistCard(
                padding: const EdgeInsets.all(AppTheme.s16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'SECURITY SPECIFICATION',
                          style: AppTheme.monoBold.copyWith(fontSize: 11, color: AppTheme.textPrimary),
                        ),
                        Text(
                          '[ LAYER 01-03 ]',
                          style: AppTheme.mono.copyWith(fontSize: 10, color: AppTheme.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppTheme.s12),
                    _buildPillarRow('01', 'HEMODYNAMIC rPPG', 'Real-time vascular blood volume pulse'),
                    const SizedBox(height: AppTheme.s8),
                    _buildPillarRow('02', 'BEHAVIORAL DYNAMICS', 'Ocular blinks, head saccades & reaction latency'),
                    const SizedBox(height: AppTheme.s8),
                    _buildPillarRow('03', 'ONNX ANTI-SPOOFING', 'MiniFASNetV2-SE zero-trust PAD evaluation'),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.s24),

              // ─── Call To Action ───
              BrutalistButton(
                label: 'VERIFY IDENTITY',
                icon: Icons.shield_outlined,
                onPressed: _onStart,
              ),

              const SizedBox(height: AppTheme.s12),
              Center(
                child: Text(
                  'Compliant with Zero-Browser/Device Storage Security Policy',
                  style: AppTheme.mono.copyWith(fontSize: 10, color: AppTheme.textMuted),
                ),
              ),
              const SizedBox(height: AppTheme.s8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPillarRow(String index, String title, String description) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
          decoration: BoxDecoration(
            color: AppTheme.border,
            borderRadius: BorderRadius.circular(AppTheme.r2),
          ),
          child: Text(
            index,
            style: AppTheme.monoBold.copyWith(fontSize: 9, color: Colors.white),
          ),
        ),
        const SizedBox(width: AppTheme.s8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTheme.monoBold.copyWith(fontSize: 11, color: AppTheme.textPrimary),
              ),
              Text(
                description,
                style: AppTheme.bodySmall.copyWith(fontSize: 11, color: AppTheme.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
