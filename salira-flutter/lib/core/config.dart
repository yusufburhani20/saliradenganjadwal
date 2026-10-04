/// Konfigurasi aplikasi.
///
/// Atur URL API saat menjalankan/build:
///   flutter run --dart-define=API_URL=https://domain-anda.com/api
class AppConfig {
  AppConfig._();

  /// 10.0.2.2 = localhost host machine dari Android emulator.
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:8000/api',
  );

  /// Host tanpa suffix `/api` (untuk akses file storage / foto presensi).
  static String get baseHost => apiUrl.replaceFirst(RegExp(r'/api/?$'), '');

  static String storageUrl(String path) => '$baseHost/storage/$path';
}
