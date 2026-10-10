import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import 'api_config.dart';

/// Manages mobile client authentication against the Spring Boot backend.
/// Automatically handles token acquisition and Bearer injection.
class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final http.Client _client = http.Client();

  String? _accessToken;
  String? _username;
  List<String> _roles = [];

  String? get token => _accessToken;
  String? get username => _username;
  List<String> get roles => List.unmodifiable(_roles);
  bool get isAuthenticated => _accessToken != null && _accessToken!.isNotEmpty;

  /// Returns Authorization header map if authenticated.
  Map<String, String> get authHeaders {
    if (_accessToken != null && _accessToken!.isNotEmpty) {
      return {'Authorization': 'Bearer $_accessToken'};
    }
    return {};
  }

  /// Ensures a valid JWT is present before protected API requests.
  /// If not authenticated, silently attempts authentication with the demo operator account.
  Future<bool> ensureAuthenticated() async {
    if (isAuthenticated) return true;

    // Attempt default mobile operator authentication
    debugPrint('[AUTH] Attempting silent authentication with mobile operator account...');
    final success = await login('mobile_operator', 'ArgusMobile2026!');
    if (success) return true;

    // If operator account does not exist, auto-register it
    debugPrint('[AUTH] Account does not exist. Auto-registering mobile operator...');
    return await register('mobile_operator', 'mobile_operator@argus.internal', 'ArgusMobile2026!');
  }

  /// Explicit user login.
  Future<bool> login(String username, String password) async {
    try {
      final response = await _client.post(
        Uri.parse(ApiConfig.authLogin),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        _accessToken = data['accessToken']?.toString();
        _username = username;
        if (data['user'] != null && data['user']['roles'] != null) {
          _roles = List<String>.from(data['user']['roles']);
        }
        debugPrint('[AUTH] Login successful! Token acquired.');
        return true;
      } else {
        debugPrint('[AUTH] Login failed: ${response.statusCode} - ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('[AUTH] Network error during login: $e');
      return false;
    }
  }

  /// Explicit user registration.
  Future<bool> register(String username, String email, String password) async {
    try {
      final response = await _client.post(
        Uri.parse(ApiConfig.authRegister),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'email': email,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 8));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        _accessToken = data['accessToken']?.toString();
        _username = username;
        if (data['user'] != null && data['user']['roles'] != null) {
          _roles = List<String>.from(data['user']['roles']);
        }
        debugPrint('[AUTH] Registration successful! Token acquired.');
        return true;
      } else {
        debugPrint('[AUTH] Registration failed: ${response.statusCode} - ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('[AUTH] Network error during registration: $e');
      return false;
    }
  }

  /// Clear session credentials.
  void logout() {
    _accessToken = null;
    _username = null;
    _roles = [];
    debugPrint('[AUTH] User logged out.');
  }

  void dispose() {
    _client.close();
  }
}
