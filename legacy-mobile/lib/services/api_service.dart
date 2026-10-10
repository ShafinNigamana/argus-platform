import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import 'api_config.dart';
import 'auth_service.dart';

/// Handles all Argus backend API communication.
/// Injects Bearer JWT tokens and routes calls to current Spring Boot backend.
class ApiService {
  ApiService({String? baseUrl}) {
    if (baseUrl != null) {
      ApiConfig.setCustomBaseUrl(baseUrl);
    }
  }

  String? _sessionId;
  http.Client? _client;
  http.Client get _activeClient => _client ??= http.Client();
  final AuthService _authService = AuthService();

  String? get sessionId => _sessionId;
  bool get hasSession => _sessionId != null;

  void setSessionId(String id) => _sessionId = id;
  void setBaseUrl(String url) => ApiConfig.setCustomBaseUrl(url);

  /// Helper to build JSON request headers with Bearer authentication.
  Map<String, String> _headers() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_authService.isAuthenticated) {
      headers['Authorization'] = 'Bearer ${_authService.token}';
    }
    return headers;
  }

  /// System health probe check.
  Future<Map<String, dynamic>?> checkHealth() async {
    try {
      final response = await _activeClient.get(
        Uri.parse(ApiConfig.healthCheck),
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('[API] Health check probe failed: $e');
      return null;
    }
  }

  /// Silently wakes up / pre-warms backend and validates token.
  Future<void> preWarm() async {
    try {
      debugPrint('[API] Pre-warming backend at ${ApiConfig.baseUrl}...');
      await checkHealth();
      await _authService.ensureAuthenticated();
      debugPrint('[API] Backend pre-warm completed.');
    } catch (_) {
      // Ignore errors during pre-warming
    }
  }

  /// Starts a new verification session. Returns sessionId.
  Future<String?> startSession() async {
    try {
      // 1. Ensure authenticated
      final authenticated = await _authService.ensureAuthenticated();
      if (!authenticated) {
        debugPrint('[API] Authentication required to start verification session.');
      }

      // 2. Call POST /api/v1/session/start
      final response = await _activeClient.post(
        Uri.parse(ApiConfig.sessionStart),
        headers: _headers(),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final body = jsonDecode(response.body);
        _sessionId = body['sessionId']?.toString();
        debugPrint('\n==================================================');
        debugPrint('🟢 BACKEND CONNECTED! SESSION STARTED');
        debugPrint('Session ID: $_sessionId');
        debugPrint('==================================================\n');
        return _sessionId;
      } else {
        debugPrint('\n==================================================');
        debugPrint('🔴 SESSION START FAILED: ${response.statusCode} - ${response.body}');
        debugPrint('Ensure Spring Boot is running on port 8080');
        debugPrint('==================================================\n');
        return null;
      }
    } catch (e) {
      debugPrint('\n==================================================');
      debugPrint('🔴 CONNECTION ERROR: Could not reach backend at ${ApiConfig.baseUrl}');
      debugPrint('Error: $e');
      debugPrint('==================================================\n');
      return null;
    }
  }

  /// Send a batch of green-channel physiological signal values.
  Future<bool> sendSignal({
    required List<double> signal,
    required int fps,
    String roi = 'forehead',
  }) async {
    if (_sessionId == null) return false;
    if (signal.isEmpty) return true;

    try {
      final payload = {
        'timestamp': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'fps': fps,
        'roi': roi,
        'signal': signal.map((v) => double.parse(v.toStringAsFixed(2))).toList(),
      };

      final response = await _activeClient.post(
        Uri.parse(ApiConfig.sessionSignal(_sessionId!)),
        headers: _headers(),
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200 || response.statusCode == 201) {
        debugPrint('📡 [SIGNAL] Sent signal batch to backend (size=${signal.length})');
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

  /// Send behavioral data (blinks, head movements).
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

      final response = await _activeClient.post(
        Uri.parse(ApiConfig.sessionBehavior(_sessionId!)),
        headers: _headers(),
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        debugPrint('❌ Send behavior failed: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('Send behavior error: $e');
      return null;
    }
  }

  /// Send challenge attempts and reactions.
  Future<Map<String, dynamic>?> sendChallenge({
    required List<Map<String, dynamic>> challenges,
  }) async {
    if (_sessionId == null) return null;

    try {
      final response = await _activeClient.post(
        Uri.parse(ApiConfig.sessionChallenge(_sessionId!)),
        headers: _headers(),
        body: jsonEncode(challenges),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        debugPrint('❌ Send challenge failed: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('Send challenge error: $e');
      return null;
    }
  }

  /// Polls the final verification result from backend.
  Future<Map<String, dynamic>?> getResult() async {
    if (_sessionId == null) return null;

    try {
      final response = await _activeClient.get(
        Uri.parse(ApiConfig.sessionResult(_sessionId!)),
        headers: _headers(),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else if (response.statusCode == 400) {
        final body = jsonDecode(response.body);
        final message = body['message']?.toString() ?? '';
        if (message.contains('EXPIRED')) {
          return {'error': 'SESSION_EXPIRED'};
        }
        return {'error': 'SERVER_ERROR', 'message': message};
      } else if (response.statusCode == 401) {
        return {'error': 'UNAUTHORIZED', 'message': 'Authentication session expired'};
      } else {
        return {'error': 'SERVER_ERROR', 'statusCode': response.statusCode};
      }
    } catch (e) {
      debugPrint('Get result error: $e');
      return {'error': 'NETWORK_ERROR'};
    }
  }

  /// Fetch cryptographic verification record.
  Future<Map<String, dynamic>?> getVerificationRecord(String sessionId) async {
    try {
      final response = await _activeClient.get(
        Uri.parse(ApiConfig.verifyRecord(sessionId)),
        headers: _headers(),
      ).timeout(const Duration(seconds: 6));

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
    _client?.close();
    _client = null;
  }
}
