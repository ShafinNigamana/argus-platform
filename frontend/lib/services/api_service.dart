import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Handles all Argus backend API communication.
///
/// Session lifecycle: startSession → sendSignal (repeated) → sendBehavior → sendChallenge → getResult
class ApiService {
  ApiService({String? baseUrl})
      // Production backend on Google Cloud Run
      : _baseUrl = baseUrl ?? 'https://argus-backend-824308665988.us-central1.run.app';
  String _baseUrl;
  String? _sessionId;
  final http.Client _client = http.Client();

  String? get sessionId => _sessionId;
  bool get hasSession => _sessionId != null;

  /// Set session ID explicitly (used by ProcessingScreen for polling).
  void setSessionId(String id) => _sessionId = id;

  /// Update the base URL (e.g. when backend moves to Cloud Run).
  void setBaseUrl(String url) => _baseUrl = url;

  /// Silently wake up the backend (handles Cloud Run cold start).
  Future<void> preWarm() async {
    try {
      debugPrint('☕ Pre-warming backend...');
      await _client.get(Uri.parse('$_baseUrl/')).timeout(const Duration(seconds: 5));
      debugPrint('✅ Backend is awake!');
    } catch (_) {
      // Ignore errors during pre-warming
    }
  }

  /// Start a new verification session. Returns the session ID.
  Future<String?> startSession() async {
    try {
      final response = await _client.post(
        Uri.parse('$_baseUrl/api/v1/session/start'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 15)); // Increased to handle Cloud Run cold start

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body);
        _sessionId = body['sessionId']?.toString();
        debugPrint('\n==================================================');
        debugPrint('🟢 BACKEND CONNECTED SUCCESSFULLY! SESSION STARTED 🟢');
        debugPrint('Session ID: $_sessionId');
        debugPrint('==================================================\n');
        return _sessionId;
      } else {
        debugPrint('\n==================================================');
        debugPrint('🔴 BACKEND CONNECTION FAILED: ${response.statusCode} 🔴');
        debugPrint('Ensure the laptop firewall is off and IP is correct!');
        debugPrint('==================================================\n');
        return null;
      }
    } catch (e) {
      debugPrint('\n==================================================');
      debugPrint('🔴 CONNECTION ERROR: Could not reach backend 🔴');
      debugPrint('Is the backend laptop IP correct? Is it running?');
      debugPrint('Error: $e');
      debugPrint('==================================================\n');
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
      ).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200 || response.statusCode == 201) {
        debugPrint('📡 [SUCCESS] Sent 1-sec heartbeat & signal batch to backend!');
        return true;
      } else {
        debugPrint('❌ Send signal failed: ${response.statusCode}');
        return false;
      }
    } catch (e) {
      debugPrint('Send signal error: $e');
      return false;
    }
  }

  /// Send behavioral data (blinks, head movements) to the backend.
  /// Should be called once, after challenges complete, before fetching result.
  Future<Map<String, dynamic>?> sendBehavior({
    required List<Map<String, dynamic>> blinkEvents,
    required List<Map<String, dynamic>> headMovements,
    required int sessionDuration,
  }) async {
    if (_sessionId == null) return null;

    try {
      final payload = {
        'blinkEvents': blinkEvents,
        'headMovements': headMovements,
        'sessionDuration': sessionDuration,
      };

      debugPrint('📤 [BEHAVIOR] Sending ${blinkEvents.length} blinks, '
          '${headMovements.length} movements, duration=${sessionDuration}ms');

      final response = await _client.post(
        Uri.parse('$_baseUrl/api/v1/session/$_sessionId/behavior'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        debugPrint('✅ [BEHAVIOR] Response: $body');
        return body;
      } else {
        debugPrint('❌ Send behavior failed: ${response.statusCode} ${response.body}');
        return null;
      }
    } catch (e) {
      debugPrint('Send behavior error: $e');
      return null;
    }
  }

  /// Send challenge execution data to the backend.
  /// Should be called once, after challenges complete, before fetching result.
  Future<Map<String, dynamic>?> sendChallenge({
    required List<Map<String, dynamic>> challenges,
  }) async {
    if (_sessionId == null) return null;

    try {
      debugPrint('📤 [CHALLENGES] Sending ${challenges.length} attempts...');

      final response = await _client.post(
        Uri.parse('$_baseUrl/api/v1/session/$_sessionId/challenge'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(challenges),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        debugPrint('✅ [CHALLENGE] Response: $body');
        return body;
      } else {
        debugPrint('❌ Send challenge failed: ${response.statusCode} ${response.body}');
        return null;
      }
    } catch (e) {
      debugPrint('Send challenge error: $e');
      return null;
    }
  }

  /// Get the final verification result from the backend.
  Future<Map<String, dynamic>?> getResult() async {
    if (_sessionId == null) return null;

    try {
      final response = await _client.get(
        Uri.parse('$_baseUrl/api/v1/session/$_sessionId/result'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else if (response.statusCode == 400) {
        final body = jsonDecode(response.body);
        final message = body['message']?.toString() ?? '';
        if (message.contains('EXPIRED')) {
          debugPrint('⏰ Session expired');
          return {'error': 'SESSION_EXPIRED'};
        }
        debugPrint('Get result failed: ${response.statusCode} $message');
        return {'error': 'SERVER_ERROR', 'message': message};
      } else {
        debugPrint('Get result failed: ${response.statusCode}');
        return {'error': 'SERVER_ERROR'};
      }
    } catch (e) {
      debugPrint('Get result error: $e');
      return {'error': 'NETWORK_ERROR'};
    }
  }

  /// Fetch the tamper-proof verification record (Trust Layer).
  Future<Map<String, dynamic>?> getVerificationRecord(String sessionId) async {
    try {
      final response = await _client.get(
        Uri.parse('$_baseUrl/api/v1/verify/$sessionId'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('Fetch verification record error: $e');
      return null;
    }
  }

  void dispose() {
    _client.close();
  }
}
