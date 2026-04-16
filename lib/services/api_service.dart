import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Handles all Argus backend API communication.
///
/// Session lifecycle: startSession → sendSignal (repeated) → getResult
class ApiService {
  ApiService({String? baseUrl})
      : _baseUrl = baseUrl ?? 'http://10.0.2.2:8080'; // Android emulator localhost

  String _baseUrl;
  String? _sessionId;
  final http.Client _client = http.Client();

  String? get sessionId => _sessionId;
  bool get hasSession => _sessionId != null;

  /// Update the base URL (e.g. when backend moves to Cloud Run).
  void setBaseUrl(String url) => _baseUrl = url;

  /// Start a new verification session. Returns the session ID.
  Future<String?> startSession() async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/api/v1/session/start'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body);
        _sessionId = body['sessionId']?.toString();
        debugPrint('Session started: $_sessionId');
        return _sessionId;
      } else {
        debugPrint('Start session failed: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('Start session error: $e');
      return null;
    }
  }

  /// Send a batch of green-channel signal values to the backend.
  Future<bool> sendSignal({
    required List<double> signal,
    required int fps,
    String roi = 'forehead',
  }) async {
    if (_sessionId == null) return false;
    if (signal.isEmpty) return true; // nothing to send

    try {
      final payload = {
        'timestamp': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'fps': fps,
        'roi': roi,
        'signal': signal.map((v) => double.parse(v.toStringAsFixed(2))).toList(),
      };

      final response = await _client.post(
        Uri.parse('$_baseUrl/api/v1/session/$_sessionId/signal'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return true;
      } else {
        debugPrint('Send signal failed: ${response.statusCode}');
        return false;
      }
    } catch (e) {
      debugPrint('Send signal error: $e');
      return false;
    }
  }

  /// Get the final verification result from the backend.
  Future<Map<String, dynamic>?> getResult() async {
    if (_sessionId == null) return null;

    try {
      final response = await _client.get(
        Uri.parse('$_baseUrl/api/v1/session/$_sessionId/result'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        debugPrint('Get result failed: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('Get result error: $e');
      return null;
    }
  }

  void dispose() {
    _client.close();
  }
}
