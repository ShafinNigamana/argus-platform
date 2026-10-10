import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../theme/app_theme.dart';

/// Stores and displays past verification sessions.
class SessionHistory {
  static const _key = 'session_history';

  /// Save a verification result to local history.
  static Future<void> save({
    required String sessionId,
    required String status,
    required int score,
    String? failReason,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_key) ?? [];
    final entry = jsonEncode({
      'sessionId': sessionId,
      'status': status,
      'score': score,
      'failReason': failReason,
      'timestamp': DateTime.now().toIso8601String(),
    });
    list.insert(0, entry); // newest first
    if (list.length > 20) list.removeLast(); // cap at 20
    await prefs.setStringList(_key, list);
  }

  /// Load all saved sessions.
  static Future<List<Map<String, dynamic>>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_key) ?? [];
    return list
        .map((e) => jsonDecode(e) as Map<String, dynamic>)
        .toList();
  }
}

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Map<String, dynamic>> _sessions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final sessions = await SessionHistory.load();
    if (mounted) setState(() { _sessions = sessions; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('AUDIT LOG HISTORY', style: AppTheme.monoBold.copyWith(fontSize: 14)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _sessions.isEmpty
              ? _buildEmpty()
              : ListView.separated(
                  padding: const EdgeInsets.all(AppTheme.s16),
                  itemCount: _sessions.length,
                  separatorBuilder: (context, index) => const SizedBox(height: AppTheme.s8),
                  itemBuilder: (context, i) => _buildCard(_sessions[i]),
                ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: BrutalistCard(
        padding: const EdgeInsets.all(AppTheme.s24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.history, size: 48, color: AppTheme.textMuted),
            const SizedBox(height: AppTheme.s12),
            Text('NO PREVIOUS AUDIT RECORDS', style: AppTheme.monoBold.copyWith(fontSize: 12)),
            const SizedBox(height: AppTheme.s6),
            Text(
              'Past biometric verifications and liveness scores will be cataloged here.',
              style: AppTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(Map<String, dynamic> session) {
    final passed = session['status'] == 'PASS';
    final score = session['score'] ?? 0;
    final ts = DateTime.tryParse(session['timestamp'] ?? '');
    final timeStr = ts != null
        ? '${ts.year}-${ts.month.toString().padLeft(2, '0')}-${ts.day.toString().padLeft(2, '0')} ${ts.hour.toString().padLeft(2, '0')}:${ts.minute.toString().padLeft(2, '0')}'
        : 'Unknown';

    return BrutalistCard(
      padding: const EdgeInsets.all(AppTheme.s12),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: passed ? AppTheme.success : AppTheme.error,
              border: Border.all(color: AppTheme.border, width: 1.5),
              borderRadius: BorderRadius.circular(AppTheme.r2),
            ),
            child: Icon(
              passed ? Icons.check : Icons.close,
              color: Colors.white,
              size: 18,
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
                    Text(
                      passed ? 'VERIFIED HUMAN' : 'ATTACK DETECTED',
                      style: AppTheme.monoBold.copyWith(
                        fontSize: 11,
                        color: passed ? AppTheme.success : AppTheme.error,
                      ),
                    ),
                    Text(
                      'SCORE: $score/100',
                      style: AppTheme.monoBold.copyWith(fontSize: 11, color: AppTheme.textPrimary),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                if (!passed && session['failReason'] != null)
                  Text(
                    session['failReason'],
                    style: AppTheme.mono.copyWith(fontSize: 10, color: AppTheme.error),
                  ),
                Text(
                  timeStr,
                  style: AppTheme.mono.copyWith(fontSize: 10, color: AppTheme.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
