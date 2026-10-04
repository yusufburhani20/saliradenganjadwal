import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'config.dart';

/// Pengganti `src/services/api.ts` (Axios + interceptor Bearer token & 401).
class ApiClient {
  ApiClient._() {
    dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await getToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (e, handler) {
        final path = e.requestOptions.path;
        if (e.response?.statusCode == 401 &&
            !path.endsWith('/logout') &&
            !path.endsWith('/login')) {
          onUnauthorized?.call();
        }
        handler.next(e);
      },
    ));
  }

  static final ApiClient instance = ApiClient._();

  static const _tokenKey = 'userToken';
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  late final Dio dio;

  /// Dipanggil saat server membalas 401 (token tidak valid / kedaluwarsa).
  void Function()? onUnauthorized;

  Future<String?> getToken() => _storage.read(key: _tokenKey);
  Future<void> setToken(String token) =>
      _storage.write(key: _tokenKey, value: token);
  Future<void> clearToken() => _storage.delete(key: _tokenKey);
}

/// Ambil pesan error yang ramah dari response Laravel / Dio.
String errorMessage(Object e, [String fallback = 'Terjadi kesalahan']) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    if (e.message != null && e.response == null) {
      return 'Tidak dapat terhubung ke server';
    }
  }
  return fallback;
}
