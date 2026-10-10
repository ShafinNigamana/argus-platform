import 'package:flutter/foundation.dart';

/// Configuration and resolution for Argus backend API endpoints.
/// Supports dynamic host switching between Android Emulator, iOS Simulator,
/// Localhost, and production deployments.
class ApiConfig {
  ApiConfig._();

  static const String _envUrl = String.fromEnvironment('ARGUS_API_URL');
  static String? _customBaseUrl;

  /// Returns the active backend base URL.
  static String get baseUrl {
    if (_customBaseUrl != null && _customBaseUrl!.isNotEmpty) {
      return _customBaseUrl!;
    }
    if (_envUrl.isNotEmpty) {
      return _envUrl;
    }
    if (kIsWeb) {
      return 'http://localhost:8080';
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        // Android Emulator accesses host machine localhost via 10.0.2.2
        return 'http://10.0.2.2:8080';
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
      case TargetPlatform.linux:
      default:
        return 'http://localhost:8080';
    }
  }

  /// Override the active base URL dynamically at runtime.
  static void setCustomBaseUrl(String? url) {
    if (url != null && url.trim().isNotEmpty) {
      _customBaseUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
    } else {
      _customBaseUrl = null;
    }
  }

  // Core API Routes (Conforms to current Spring Boot backend contract)
  static String get healthCheck => '$baseUrl/api/v1/verify/health-check';
  static String get authLogin => '$baseUrl/api/v1/auth/login';
  static String get authRegister => '$baseUrl/api/v1/auth/register';
  static String get sessionStart => '$baseUrl/api/v1/session/start';
  static String sessionSignal(String sessionId) => '$baseUrl/api/v1/session/$sessionId/signal';
  static String sessionBehavior(String sessionId) => '$baseUrl/api/v1/session/$sessionId/behavior';
  static String sessionChallenge(String sessionId) => '$baseUrl/api/v1/session/$sessionId/challenge';
  static String sessionResult(String sessionId) => '$baseUrl/api/v1/session/$sessionId/result';
  static String verifyRecord(String sessionId) => '$baseUrl/api/v1/verify/$sessionId';
}
