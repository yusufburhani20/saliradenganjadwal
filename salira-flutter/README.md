# SALIRA Mobile — Flutter

Versi Flutter dari `salira-mobile` (React Native / Expo). Mengonsumsi API Laravel
yang sama, fitur dan alur layar dipertahankan.

## Setup

Flutter SDK harus terpasang (https://docs.flutter.dev/get-started/install).

```bash
cd salira-flutter

# 1. Generate folder platform (android/ ios/) — kode lib/ tidak ditimpa
flutter create . --org id.salira --project-name salira_mobile --platforms=android,ios

# 2. Ambil dependency
flutter pub get

# 3. Jalankan (ganti URL API sesuai server)
flutter run --dart-define=API_URL=https://domain-anda.com/api
```

Default `API_URL` = `http://10.0.2.2:8000/api` (localhost dari emulator Android).

## Izin platform (wajib ditambahkan setelah `flutter create`)

**Android** — `android/app/src/main/AndroidManifest.xml`, di dalam `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
```

`flutter_secure_storage` butuh `minSdkVersion 23` — di `android/app/build.gradle(.kts)`
set `minSdk = 23`.

Jika API memakai `http://` (bukan https), tambahkan
`android:usesCleartextTraffic="true"` pada tag `<application>`.

**iOS** — `ios/Runner/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Lokasi dibutuhkan untuk validasi presensi.</string>
<key>NSCameraUsageDescription</key>
<string>Kamera dibutuhkan untuk foto presensi.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Akses foto untuk presensi.</string>
```

## Pemetaan dari React Native

| React Native | Flutter |
| --- | --- |
| `services/api.ts` (Axios) | `lib/core/api_client.dart` (Dio) |
| `services/api/*.ts` | `lib/services/api_services.dart` |
| `types/*.ts` | `lib/models/models.dart` |
| `useAuth` | `lib/providers/auth_provider.dart` (Provider) |
| `useAttendance` | `lib/providers/attendance_controller.dart` |
| `Router.tsx` (React Navigation) | `lib/router.dart` (go_router) |
| `expo-secure-store` | `flutter_secure_storage` |
| `expo-location` | `geolocator` |
| `expo-camera` | `image_picker` (kamera depan) |
| `react-native-webview` + Leaflet | `flutter_map` (OpenStreetMap) |

## Belum dimigrasi

- **Push notification**: versi RN memakai *Expo push token* (`POST /device-token`).
  Flutter butuh FCM (`firebase_messaging`) dan backend harus mengirim lewat FCM,
  bukan Expo Push API. Perlu perubahan di backend Laravel.
- Data statis di Beranda (statistik, ranking, status presensi) sama seperti
  versi RN — masih contoh, belum dari API.
- Build web: `dart:io` (`File`) dipakai untuk foto presensi, jadi target utama
  adalah Android/iOS.
