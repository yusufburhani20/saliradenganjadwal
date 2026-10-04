import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/models.dart';
import '../services/api_services.dart';

/// Padanan `useAuth.tsx` (AuthProvider + useAuth).
class AuthProvider extends ChangeNotifier {
  AuthProvider() {
    ApiClient.instance.onUnauthorized = _forceLogout;
    _init();
  }

  User? user;
  bool isLoading = true;

  Future<void> _init() async {
    try {
      final token = await ApiClient.instance.getToken();
      if (token != null && token.isNotEmpty) {
        user = await AuthService.me();
      }
    } catch (_) {
      await ApiClient.instance.clearToken();
      user = null;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> login(String identifier, String password) async {
    final res = await AuthService.login(identifier, password);
    await ApiClient.instance.setToken(res.token);
    user = res.user;
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await AuthService.logout();
    } catch (_) {
      // abaikan jika token sudah tidak valid
    }
    await _forceLogout();
  }

  Future<void> _forceLogout() async {
    if (user == null) return;
    await ApiClient.instance.clearToken();
    user = null;
    notifyListeners();
  }
}
