import 'package:flutter/foundation.dart';
import 'package:cross_file/cross_file.dart';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../models/models.dart';
import '../providers/attendance_controller.dart';
import '../providers/auth_provider.dart';

enum _View { dashboard, preview }

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  final _ctrl = AttendanceController();
  final _picker = ImagePicker();

  _View _view = _View.dashboard;
  Position? _position;
  XFile? _photo;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _ctrl.refreshAll();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  /// Alur: konfirmasi GPS -> izin lokasi -> ambil foto (kamera depan) -> preview.
  Future<void> _startCheckIn() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi'),
        content: const Text('Mohon aktifkan GPS sebelum melakukan presensi.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('OK')),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    if (!await Geolocator.isLocationServiceEnabled()) {
      showSnack(context, 'Lokasi (GPS) wajib diaktifkan.', error: true);
      return;
    }
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      if (mounted) showSnack(context, 'Izin lokasi (GPS) ditolak.', error: true);
      return;
    }

    final shot = await _picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.front,
      imageQuality: 50,
    );
    if (shot == null || !mounted) return;

    setState(() {
      _photo = shot;
      _position = null;
      _view = _View.preview;
    });
    _refineLocation(high: false);
  }

  Future<void> _refineLocation({bool high = true}) async {
    try {
      final p = await Geolocator.getCurrentPosition(
        locationSettings: LocationSettings(
          accuracy: high ? LocationAccuracy.best : LocationAccuracy.high,
          timeLimit: const Duration(seconds: 20),
        ),
      );
      if (mounted) setState(() => _position = p);
    } catch (_) {
      if (mounted) showSnack(context, 'Gagal membaca lokasi', error: true);
    }
  }

  Future<void> _retake() async {
    final shot = await _picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.front,
      imageQuality: 50,
    );
    if (shot != null) setState(() => _photo = shot);
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      var pos = _position;
      pos ??= await Geolocator.getCurrentPosition();
      await _ctrl.submitCheckIn(latitude: pos.latitude, longitude: pos.longitude, photo: _photo);
      if (!mounted) return;
      setState(() {
        _photo = null;
        _view = _View.dashboard;
      });
      showSnack(context, 'Presensi berhasil disimpan.');
    } catch (e) {
      if (mounted) showSnack(context, errorMessage(e, 'Gagal mengirim presensi.'), error: true);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _view == _View.dashboard,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _view == _View.preview) setState(() => _view = _View.dashboard);
      },
      child: ListenableBuilder(
        listenable: _ctrl,
        builder: (context, _) => _view == _View.preview ? _preview(context) : _dashboard(context),
      ),
    );
  }

  // ─── Dashboard ──────────────────────────────────────────────
  Widget _dashboard(BuildContext context) {
    final t = _ctrl.today;
    final inDone = t?.checkIn != null;
    final outDone = t?.checkOut != null;
    final disabled = inDone && outDone;
    final todayStr = formatDateId(DateTime.now(), 'EEE, dd MMM yyyy');

    Widget timeCol(IconData icon, Color iconColor, String label, String? val, Color valColor, {bool verified = false}) => Expanded(
          child: Row(children: [
            CircleAvatar(radius: 16, backgroundColor: AppColors.surfaceLow, child: Icon(icon, size: 16, color: iconColor)),
            const SizedBox(width: 6),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: const TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant)),
              Row(children: [
                Text(val ?? '--:--', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: valColor)),
                if (verified) const Padding(padding: EdgeInsets.only(left: 4), child: Icon(Icons.verified, size: 16, color: AppColors.secondary)),
              ]),
            ]),
          ]),
        );

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        TabHeader(title: 'Presensi Kehadiran'),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _ctrl.refreshAll,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
              children: [
                GradientBanner(
                  tag: 'GURU & PEGAWAI',
                  title: 'Kehadiran Anda',
                  desc: 'Pantau log kehadiran dan status secara real-time.',
                  stats: [
                    BannerStat('Total Presensi', '${_ctrl.history.length}'),
                    const BannerStat('Terlambat', '0', Color(0xFFFFB95F)),
                    const BannerStat('Lembur', '0', Color(0xFF6FFBBE)),
                  ],
                ),
                const SizedBox(height: 14),
                if (_ctrl.isLoadingToday && t == null)
                  const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()))
                else
                  AppCard(
                    padding: const EdgeInsets.all(16),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('Hari Ini ($todayStr)', style: const TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant)),
                            const Text('Jadwal Presensi Masuk & Pulang', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                          ]),
                        ),
                        const Icon(Icons.access_time, color: AppColors.primary),
                      ]),
                      const SizedBox(height: 14),
                      Row(children: [
                        timeCol(Icons.login, AppColors.primary, 'Absen Masuk', t?.checkIn, inDone ? AppColors.secondary : AppColors.onSurface, verified: inDone),
                        Container(width: 1, height: 36, color: AppColors.outlineVariant, margin: const EdgeInsets.symmetric(horizontal: 8)),
                        timeCol(Icons.logout, AppColors.error, 'Absen Pulang', t?.checkOut, outDone ? AppColors.secondary : AppColors.error),
                      ]),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: disabled ? null : _startCheckIn,
                        child: const Text('Ambil Presensi Kamera'),
                      ),
                      const SizedBox(height: 14),
                      for (final h in _ctrl.history.take(4)) _historyRow(h),
                      Center(
                        child: TextButton(
                          onPressed: () => context.push('/attendance-history'),
                          child: const Text('Lihat Riwayat & Foto', style: TextStyle(fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ]),
                  ),
                if (_ctrl.error != null) ErrorBox(_ctrl.error!),
              ],
            ),
          ),
        ),
      ]),
    );
  }

  Widget _historyRow(AttendanceData h) {
    final d = DateTime.tryParse(h.date);
    final dateStr = d == null ? h.date : formatDateId(d, 'EEE, dd MMM yyyy');
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(dateStr, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Row(children: [
              if (h.checkIn != null) ...[
                const Icon(Icons.login, size: 14, color: AppColors.primary),
                const SizedBox(width: 4),
                Text(h.checkIn!, style: const TextStyle(fontSize: 12)),
                const SizedBox(width: 16),
              ],
              if (h.checkOut != null) ...[
                const Icon(Icons.logout, size: 14, color: AppColors.error),
                const SizedBox(width: 4),
                Text(h.checkOut!, style: const TextStyle(fontSize: 12)),
              ],
            ]),
          ]),
        ),
        const Text('Terkirim', style: TextStyle(fontSize: 11, color: AppColors.secondary, fontWeight: FontWeight.w600)),
        const SizedBox(width: 4),
        const Icon(Icons.check_circle, size: 20, color: AppColors.secondary),
      ]),
    );
  }

  // ─── Preview ────────────────────────────────────────────────
  Widget _preview(BuildContext context) {
    final user = context.read<AuthProvider>().user;
    final now = DateTime.now();
    final timeStr = formatDateId(now, 'HH:mm');
    final dateStr = formatDateId(now, 'MMM d, yyyy');
    final pos = _position;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _view = _View.dashboard)),
        title: const Text('Preview', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: ListView(children: [
        SizedBox(
          height: 240,
          child: Stack(children: [
            if (pos != null)
              FlutterMap(
                key: ValueKey('${pos.latitude},${pos.longitude}'),
                options: MapOptions(
                  initialCenter: LatLng(pos.latitude, pos.longitude),
                  initialZoom: 16,
                  interactionOptions: const InteractionOptions(flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag),
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'id.salira.mobile',
                  ),
                  CircleLayer(circles: [
                    CircleMarker(
                      point: LatLng(pos.latitude, pos.longitude),
                      radius: pos.accuracy,
                      useRadiusInMeter: true,
                      color: AppColors.primary.withValues(alpha: .2),
                      borderColor: AppColors.primary,
                      borderStrokeWidth: 1,
                    ),
                  ]),
                  MarkerLayer(markers: [
                    Marker(
                      point: LatLng(pos.latitude, pos.longitude),
                      width: 40, height: 40,
                      child: const Icon(Icons.location_on, color: AppColors.error, size: 36),
                    ),
                  ]),
                ],
              )
            else
              const ColoredBox(color: AppColors.surfaceLow, child: Center(child: CircularProgressIndicator())),
            Positioned(
              left: 12, top: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99)),
                child: Text('Akurasi: ${pos?.accuracy.toStringAsFixed(1) ?? '-'} m', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ),
            Positioned(
              right: 12, bottom: 12,
              child: FilledButton.icon(
                onPressed: () => _refineLocation(),
                icon: const Icon(Icons.my_location, size: 16),
                label: const Text('Akuratkan'),
                style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
              ),
            ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(user?.name ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            Text.rich(TextSpan(text: '$dateStr, ', children: [
              TextSpan(text: timeStr, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
            ]), style: const TextStyle(color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: AspectRatio(
                aspectRatio: 4 / 3,
                child: _photo != null
                    ? FutureBuilder<Uint8List>(
                        future: _photo!.readAsBytes(),
                        builder: (ctx, snap) => snap.hasData
                            ? Image.memory(snap.data!, fit: BoxFit.cover)
                            : const ColoredBox(color: AppColors.surfaceLow),
                      )
                    : const ColoredBox(color: AppColors.surfaceLow),
              ),
            ),
            const SizedBox(height: 4),
            const Center(child: Text('Foto Presensi', style: TextStyle(fontSize: 12, color: AppColors.outline))),
            const SizedBox(height: 12),
            Row(children: [
              const Icon(Icons.gps_fixed, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              Text.rich(TextSpan(text: 'Status GPS : ', children: [
                TextSpan(
                  text: pos != null ? 'Koordinat Terbaca' : 'Membaca lokasi...',
                  style: TextStyle(color: pos != null ? AppColors.secondary : AppColors.amber, fontWeight: FontWeight.w700),
                ),
              ])),
            ]),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.primaryFixed.withValues(alpha: .4), borderRadius: BorderRadius.circular(12)),
              child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Icon(Icons.info_outline, color: AppColors.primary),
                SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Menunggu Validasi Server', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
                    SizedBox(height: 2),
                    Text('Koordinat Anda telah didapatkan. Tekan Simpan untuk memvalidasi jarak Anda dengan sekolah.', style: TextStyle(fontSize: 12, color: AppColors.primary)),
                  ]),
                ),
              ]),
            ),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(child: OutlinedButton(onPressed: _submitting ? null : _retake, style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), child: const Text('Ulangi Foto'))),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Simpan'),
                ),
              ),
            ]),
          ]),
        ),
      ]),
    );
  }
}
