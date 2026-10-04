import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import '../providers/auth_provider.dart';

class _Quick {
  final String label;
  final IconData icon;
  final Color color;
  final Color bg;
  final String route;
  const _Quick(this.label, this.icon, this.color, this.bg, this.route);
}

const _quickActions = [
  _Quick('Presensi', Icons.fingerprint, AppColors.primary, AppColors.primaryFixed, '/presensi'),
  _Quick('Jurnal KBM', Icons.event_note, AppColors.primary, AppColors.surfaceLow, '/jurnal'),
  _Quick('Penilaian', Icons.fact_check, AppColors.onSecondaryContainer, AppColors.secondaryContainer, '/penilaian'),
  _Quick('Konsultasi', Icons.support_agent, AppColors.tertiary, AppColors.tertiaryFixed, '/bimbingan'),
  _Quick('Belajar Malam', Icons.bedtime, Color(0xFF5B21B6), Color(0xFFEDE9FE), '/evening-study'),
  _Quick('Perizinan', Icons.assignment, AppColors.onSurfaceVariant, AppColors.surfaceContainer, '/leave'),
  _Quick('Notifikasi', Icons.notifications, AppColors.error, Color(0xFFFFDAD6), '/notifikasi'),
  _Quick('Semua Menu', Icons.apps, AppColors.primary, AppColors.surfaceHighest, '/all-menu'),
];

/// Catatan: seperti versi React Native, angka statistik, ranking dan
/// status presensi di beranda masih berupa data contoh (belum dari API).
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  DateTime _now = DateTime.now();
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1),
        (_) => setState(() => _now = DateTime.now()));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final firstName = (user?.name.split(' ').first.isNotEmpty ?? false)
        ? user!.name.split(' ').first
        : 'Bapak Guru';
    final time = formatDateId(_now, 'HH.mm.ss');
    final date = '${formatDateId(_now, 'EEEE, d MMMM yyyy')} • Semester Ganjil';

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        _header(context),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.only(top: 16, bottom: 110),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    _pill('SISTEM TERINTEGRASI • LIVE', AppColors.secondaryContainer, AppColors.onSecondaryContainer, dot: true),
                    Row(children: [
                      const Icon(Icons.schedule, size: 15, color: AppColors.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text('$time WIB', style: const TextStyle(fontSize: 10, color: AppColors.onSurfaceVariant)),
                    ]),
                  ]),
                  const SizedBox(height: 8),
                  Text('Selamat Bertugas, $firstName!',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.onSurface, letterSpacing: -.5)),
                  Text(date, style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
                ]),
              ),
              const SizedBox(height: 20),
              _hero(context),
              const SizedBox(height: 20),
              _stats(),
              const SizedBox(height: 20),
              _geotag(),
              const SizedBox(height: 20),
              _quickGrid(context),
              const SizedBox(height: 20),
              _ranking(),
              const SizedBox(height: 16),
              _audit(),
            ],
          ),
        ),
      ]),
    );
  }

  Widget _pill(String text, Color bg, Color fg, {bool dot = false}) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (dot) ...[
            Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.secondary, shape: BoxShape.circle)),
            const SizedBox(width: 6),
          ],
          Text(text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: .5, color: fg)),
        ]),
      );

  Widget _header(BuildContext context) => Container(
        padding: EdgeInsets.fromLTRB(16, MediaQuery.of(context).padding.top + 8, 16, 8),
        decoration: BoxDecoration(
          color: AppColors.surface.withValues(alpha: .95),
          border: const Border(bottom: BorderSide(color: Color(0x0A000000))),
        ),
        child: Row(children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(12)),
            alignment: Alignment.center,
            child: const Text('S', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Text('SALIRA', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -.5)),
                const SizedBox(width: 6),
                _pill('Ganjil', AppColors.secondaryContainer, AppColors.onSecondaryContainer),
              ]),
              Row(children: [
                Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.secondary, shape: BoxShape.circle)),
                const SizedBox(width: 4),
                const Text('Kampus Utama (Aktif)', style: TextStyle(fontSize: 10, color: AppColors.onSurfaceVariant)),
              ]),
            ]),
          ),
          Stack(children: [
            IconButton(
              onPressed: () => context.go('/notifikasi'),
              icon: const Icon(Icons.notifications, color: AppColors.onSurfaceVariant),
            ),
            Positioned(
              right: 12, top: 12,
              child: Container(width: 8, height: 8, decoration: BoxDecoration(color: AppColors.error, shape: BoxShape.circle, border: Border.all(color: AppColors.surface, width: 2))),
            ),
          ]),
          GestureDetector(
            onTap: () => context.push('/profile'),
            child: Stack(children: [
              Container(
                width: 32, height: 32,
                decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                child: const Icon(Icons.person, size: 18, color: Colors.white),
              ),
              Positioned(
                right: 0, bottom: 0,
                child: Container(width: 10, height: 10, decoration: BoxDecoration(color: AppColors.secondary, shape: BoxShape.circle, border: Border.all(color: AppColors.surface, width: 2))),
              ),
            ]),
          ),
        ]),
      );

  Widget _hero(BuildContext context) => Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.all(16),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryContainer], begin: Alignment.topLeft, end: Alignment.bottomRight),
          boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: .25), blurRadius: 14, offset: const Offset(0, 6))],
        ),
        child: Stack(children: [
          Positioned(
            right: -56, bottom: -56,
            child: Container(width: 160, height: 160, decoration: BoxDecoration(color: const Color(0xFF93CCFF).withValues(alpha: .15), shape: BoxShape.circle)),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('DASHBOARD CERDAS SALIRA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: .5, color: AppColors.primaryFixed)),
            const SizedBox(height: 4),
            const Text.rich(TextSpan(style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white, height: 1.3), children: [
              TextSpan(text: 'Optimalkan '),
              TextSpan(text: 'Pengelolaan Akademik', style: TextStyle(color: AppColors.tertiaryFixed)),
            ])),
            const SizedBox(height: 4),
            const Text('Pantau presensi, penilaian kbm, dan aktivitas santri secara real-time langsung dari genggaman.',
                style: TextStyle(fontSize: 12, color: AppColors.primaryFixed, height: 1.35)),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(child: _heroBtn('Akses Laporan', Icons.summarize, Colors.white.withValues(alpha: .15), Colors.white, AppColors.tertiaryFixed, null)),
              const SizedBox(width: 8),
              Expanded(child: _heroBtn('Presensi', Icons.qr_code_scanner, AppColors.secondaryContainer, AppColors.onSecondaryContainer, AppColors.onSecondaryContainer, () => context.go('/presensi'))),
            ]),
          ]),
        ]),
      );

  Widget _heroBtn(String label, IconData icon, Color bg, Color fg, Color iconColor, VoidCallback? onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
          child: Row(children: [
            Icon(icon, size: 20, color: iconColor),
            const SizedBox(width: 8),
            Expanded(child: Text(label, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: fg))),
            Icon(Icons.arrow_forward, size: 16, color: fg),
          ]),
        ),
      );

  Widget _stats() {
    Widget card(String label, IconData icon, Color iconColor, Color iconBg, String val, String sub, Color? subColor, String desc) => Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: const Color(0xFF0F172A).withValues(alpha: .05), blurRadius: 10, offset: const Offset(0, 2))]),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.onSurfaceVariant)),
              Container(width: 28, height: 28, decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(8)), child: Icon(icon, size: 18, color: iconColor)),
            ]),
            const SizedBox(height: 8),
            Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
              Text(val, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -1)),
              const SizedBox(width: 6),
              Text(sub, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: subColor ?? AppColors.onSurfaceVariant)),
            ]),
            Text(desc, style: const TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant)),
          ]),
        );

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.count(
        crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.35,
        children: [
          card('Siswa Hadir', Icons.how_to_reg, AppColors.secondary, AppColors.secondaryContainer.withValues(alpha: .6), '15', '100%', AppColors.secondary, 'dari total jadwal hari ini'),
          card('Izin / Sakit', Icons.medical_services, AppColors.tertiary, AppColors.tertiaryFixed, '4', 'Santri', null, "3 sakit, 1 izin syar'i"),
          card('Konsultasi', Icons.forum, AppColors.primary, AppColors.surfaceHigh, '0', 'Clear', AppColors.secondary, 'Antrean bimbingan nihil'),
          card('Inventaris Lab', Icons.inventory, AppColors.primary, AppColors.primaryFixed, '0', 'Unit', null, 'Semua aset lab aman'),
        ],
      ),
    );
  }

  Widget _geotag() => Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: const Color(0xFF0F172A).withValues(alpha: .05), blurRadius: 10, offset: const Offset(0, 2))]),
        child: Column(children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Row(children: [
              Container(width: 32, height: 32, decoration: BoxDecoration(color: AppColors.secondaryContainer, borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.pin_drop, size: 20, color: AppColors.onSecondaryContainer)),
              const SizedBox(width: 8),
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Presensi Pegawai Saya', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                Text('Radius Kampus Utama (Aktif)', style: TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant)),
              ]),
            ]),
            _pill('Tepat Waktu', AppColors.secondaryContainer, AppColors.onSecondaryContainer),
          ]),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.surfaceLow, borderRadius: BorderRadius.circular(12)),
            child: const Row(children: [
              Expanded(child: _GeoCol(Icons.login, AppColors.secondary, 'Masuk (Check-in)', '13:02:34 WIB', 'Validasi Geotag OK')),
              SizedBox(width: 8),
              Expanded(child: _GeoCol(Icons.logout, AppColors.tertiary, 'Pulang (Check-out)', 'Belum Presensi', 'Buka pkl 17:00 WIB')),
            ]),
          ),
        ]),
      );

  Widget _quickGrid(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Aksi Cepat Guru', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            GestureDetector(
              onTap: () => context.push('/all-menu'),
              child: const Text('Semua Menu →', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary)),
            ),
          ]),
          const SizedBox(height: 14),
          GridView.count(
            crossAxisCount: 4, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: .78,
            children: [
              for (final q in _quickActions)
                InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () {
                    if (q.route == '/all-menu' || q.route == '/leave' || q.route == '/evening-study') {
                      context.push(q.route);
                    } else {
                      context.go(q.route);
                    }
                  },
                  child: Column(children: [
                    Container(width: 54, height: 54, decoration: BoxDecoration(color: q.bg, borderRadius: BorderRadius.circular(16)), child: Icon(q.icon, size: 26, color: q.color)),
                    const SizedBox(height: 6),
                    Text(q.label, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.onSurface)),
                  ]),
                ),
            ],
          ),
        ]),
      );

  Widget _ranking() {
    Widget row(int n, String initial, String name, String cls, String days, String status, Color numBg, Color numFg) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(children: [
            Container(width: 24, height: 24, alignment: Alignment.center, decoration: BoxDecoration(color: numBg, shape: BoxShape.circle), child: Text('$n', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: numFg))),
            const SizedBox(width: 10),
            CircleAvatar(radius: 16, backgroundColor: AppColors.surfaceHigh, child: Text(initial, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary))),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              Text(cls, style: const TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(days, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              Text(status, style: const TextStyle(fontSize: 10, color: AppColors.secondary, fontWeight: FontWeight.w600)),
            ]),
          ]),
        );

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: const Color(0xFF0F172A).withValues(alpha: .05), blurRadius: 10, offset: const Offset(0, 2))]),
      child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Row(children: [
            Container(width: 32, height: 32, decoration: BoxDecoration(color: AppColors.tertiaryFixed, borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.emoji_events, size: 18, color: AppColors.tertiary)),
            const SizedBox(width: 8),
            const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Ranking Kehadiran Santri', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
              Text('Semester Ganjil 2026/2027', style: TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant)),
            ]),
          ]),
          const Text('Lihat Semua', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary)),
        ]),
        const SizedBox(height: 8),
        row(1, 'K', 'Khairani Noor Rohmah', 'XI TJKT PI', '28 Hari', 'Sempurna', AppColors.tertiaryFixed, AppColors.tertiary),
        row(2, 'S', 'Safa Dwi Mulyaningsih', 'XI TJKT PI', '27 Hari', '98.5%', AppColors.surfaceHigh, AppColors.onSurfaceVariant),
        row(3, 'D', 'Daffa Fajril Adha', 'XI TJKT PA', '27 Hari', '98.5%', const Color(0xFFFFE4D6), const Color(0xFF9A3412)),
      ]),
    );
  }

  Widget _audit() => Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppColors.surfaceLow, borderRadius: BorderRadius.circular(16)),
        child: Row(children: [
          Container(width: 32, height: 32, decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.verified_user, size: 18, color: AppColors.onSurfaceVariant)),
          const SizedBox(width: 10),
          const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Audit Akses Guru', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
            Text('Online via Android App • IP Terverifikasi', style: TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant)),
          ])),
          Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.secondary, shape: BoxShape.circle)),
        ]),
      );
}

class _GeoCol extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String time;
  final String status;
  const _GeoCol(this.icon, this.color, this.label, this.time, this.status);

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Flexible(child: Text(label, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: AppColors.onSurfaceVariant))),
        ]),
        const SizedBox(height: 2),
        Text(time, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
        const SizedBox(height: 2),
        Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: color)),
      ]);
}
