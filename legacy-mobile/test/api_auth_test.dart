import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:argus/services/api_config.dart';
import 'package:argus/services/auth_service.dart';
import 'package:argus/theme/app_theme.dart';

void main() {
  group('ApiConfig Tests', () {
    test('Default base URL is not empty', () {
      expect(ApiConfig.baseUrl.isNotEmpty, isTrue);
    });

    test('Custom base URL override works properly', () {
      ApiConfig.setCustomBaseUrl('http://192.168.1.50:8080');
      expect(ApiConfig.baseUrl, equals('http://192.168.1.50:8080'));
      expect(ApiConfig.healthCheck, equals('http://192.168.1.50:8080/api/v1/verify/health-check'));
      expect(ApiConfig.sessionStart, equals('http://192.168.1.50:8080/api/v1/session/start'));
      expect(ApiConfig.sessionSignal('test-123'), equals('http://192.168.1.50:8080/api/v1/session/test-123/signal'));

      // Reset
      ApiConfig.setCustomBaseUrl(null);
    });

    test('Trailing slashes are trimmed in custom base URL', () {
      ApiConfig.setCustomBaseUrl('http://localhost:8080///');
      expect(ApiConfig.baseUrl, equals('http://localhost:8080'));
      ApiConfig.setCustomBaseUrl(null);
    });
  });

  group('AuthService Tests', () {
    test('Initial state is not authenticated', () {
      final auth = AuthService();
      auth.logout();
      expect(auth.isAuthenticated, isFalse);
      expect(auth.authHeaders, isEmpty);
    });

    test('Logout clears credentials', () {
      final auth = AuthService();
      auth.logout();
      expect(auth.token, isNull);
      expect(auth.username, isNull);
      expect(auth.roles, isEmpty);
    });
  });

  group('AppTheme Neo-Brutalist Tokens Tests', () {
    test('Design system color tokens match specification', () {
      expect(AppTheme.background, equals(const Color(0xFFEEEBE3)));
      expect(AppTheme.surface, equals(const Color(0xFFF7F5EF)));
      expect(AppTheme.ink, equals(const Color(0xFF14130F)));
      expect(AppTheme.border, equals(const Color(0xFF14130F)));
      expect(AppTheme.primary, equals(const Color(0xFF2B3FE0)));
    });

    test('Hard drop shadows have 0 blur radius', () {
      expect(AppTheme.hardShadow.first.blurRadius, equals(0.0));
      expect(AppTheme.hardShadowSmall.first.blurRadius, equals(0.0));
      expect(AppTheme.hardShadowLarge.first.blurRadius, equals(0.0));
    });

    test('Confidence calculator yields appropriate levels', () {
      expect(getConfidence(90), equals(Confidence.high));
      expect(getConfidence(65), equals(Confidence.medium));
      expect(getConfidence(30), equals(Confidence.low));

      expect(getConfidenceLabel(Confidence.high), equals('HIGH'));
      expect(getConfidenceLabel(Confidence.medium), equals('MEDIUM'));
      expect(getConfidenceLabel(Confidence.low), equals('LOW'));
    });
  });
}
