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
        title: Text('Verification History', style: AppTheme.heading3),
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
                  separatorBuilder: (_, __) => const SizedBox(height: AppTheme.s8),
                  itemBuilder: (context, i) => _buildCard(_sessions[i]),
                ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.history, size: 56, color: AppTheme.textMuted.withValues(alpha: 0.3)),
          const SizedBox(height: AppTheme.s16),
          Text('No verifications yet', style: AppTheme.body),
          const SizedBox(height: AppTheme.s8),
          Text('Your verification history will appear here',
              style: AppTheme.bodySmall.copyWith(color: AppTheme.textMuted)),
        ],
      ),
    );
  }

  Widget _buildCard(Map<String, dynamic> session) {
    final passed = session['status'] == 'PASS';
    final score = session['score'] ?? 0;
    final ts = DateTime.tryParse(session['timestamp'] ?? '');
    final timeStr = ts != null
        ? '${ts.day}/${ts.month}/${ts.year} ${ts.hour.toString().padLeft(2, '0')}:${ts.minute.toString().padLeft(2, '0')}'
        : 'Unknown';

    return Container(
      padding: const EdgeInsets.all(AppTheme.s16),
      decoration: BoxDecoration(
        color: AppTheme.surface.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(AppTheme.r12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.04)),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: (passed ? AppTheme.success : AppTheme.error)
                  .withValues(alpha: 0.1),
            ),
            child: Icon(
              passed ? Icons.check_circle_rounded : Icons.cancel_rounded,
              color: passed ? AppTheme.success : AppTheme.error,
              size: 22,
            ),
          ),
          const SizedBox(width: AppTheme.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  passed ? 'Verified Human' : 'Not Verified',
                  style: AppTheme.bodySmall.copyWith(
                    color: AppTheme.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (!passed && session['failReason'] != null)
                  Text(session['failReason'],
                      style: AppTheme.mono.copyWith(fontSize: 11)),
                Text(timeStr, style: AppTheme.mono.copyWith(fontSize: 11)),
              ],
            ),
          ),
          Text('$score', style: AppTheme.heading3.copyWith(
            color: passed ? AppTheme.success : AppTheme.error,
          )),
        ],
      ),
    );
  }
}
