import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme.dart';

class _MenuItem {
  final String label;
  final String desc;
  final IconData icon;
  final Color color;
  final Color bg;
  final String route;
  final bool push;
  const _MenuItem(this.label, this.desc, this.icon, this.color, this.bg, this.route, {this.push = false});
}

class _MenuGroup {
  final String title;
  final IconData icon;
  final Color color;
  final List<_MenuItem> items;
  const _MenuGroup(this.title, this.icon, this.color, this.items);
}

const _groups = [
  _MenuGroup('Akademik', Icons.school_outlined, Color(0xFF2563EB), [
    _MenuItem('Jurnal Mengajar', 'Catat agenda dan materi KBM', Icons.menu_book_outlined, Color(0xFF059669), Color(0xFFECFDF5), '/jurnal'),
    _MenuItem('Penilaian Harian', 'Input nilai tugas, UH, kuis', Icons.assignment_outlined, Color(0xFFD97706), Color(0xFFFFFBEB), '/penilaian'),
    _MenuItem('Ujian Akhir (ASAS/ASAT)', 'Nilai ujian tengah & akhir semester', Icons.description_outlined, Color(0xFFDC2626), Color(0xFFFEF2F2), '/penilaian'),
  ]),
  _MenuGroup('Bimbingan Siswa', Icons.people_outline, Color(0xFF0891B2), [
    _MenuItem('Konsultasi / Bimbingan', 'Catat catatan bimbingan siswa', Icons.chat_bubble_outline, Color(0xFF0891B2), Color(0xFFECFEFF), '/bimbingan'),
  ]),
  _MenuGroup('Kehadiran', Icons.fingerprint, Color(0xFF2563EB), [
    _MenuItem('Presensi Saya', 'Check-in & riwayat kehadiran', Icons.fingerprint, Color(0xFF2563EB), Color(0xFFEFF6FF), '/presensi'),
  ]),
  _MenuGroup('Asrama & Malam', Icons.nightlight_outlined, Color(0xFF7C3AED), [
    _MenuItem('Belajar Malam', 'Jurnal & absensi belajar malam', Icons.nightlight_outlined, Color(0xFF7C3AED), Color(0xFFFAF5FF), '/evening-study', push: true),
  ]),
  _MenuGroup('Administrasi', Icons.folder_outlined, Color(0xFF64748B), [
    _MenuItem('Perizinan & Cuti', 'Ajukan izin, sakit, atau cuti', Icons.description_outlined, Color(0xFF7C3AED), Color(0xFFF5F3FF), '/leave', push: true),
    _MenuItem('Notifikasi', 'Pemberitahuan & pengumuman sistem', Icons.notifications_outlined, Color(0xFFDC2626), Color(0xFFFEF2F2), '/notifikasi'),
    _MenuItem('Profil & Akun', 'Data diri, NIP, dan pengaturan akun', Icons.person_outline, Color(0xFF64748B), Color(0xFFF8FAFC), '/profile', push: true),
  ]),
];

class AllMenuScreen extends StatelessWidget {
  const AllMenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        centerTitle: true,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        title: const Column(children: [
          Text('Semua Menu', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          Text('Akses semua fitur SALIRA', style: TextStyle(fontSize: 11, color: AppColors.outline)),
        ]),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final g in _groups) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 8, top: 4),
              child: Row(children: [
                Container(width: 28, height: 28, decoration: BoxDecoration(color: g.color.withValues(alpha: .1), borderRadius: BorderRadius.circular(8)), child: Icon(g.icon, size: 16, color: g.color)),
                const SizedBox(width: 8),
                Text(g.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
              ]),
            ),
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE5E7EB))),
              child: Column(children: [
                for (var i = 0; i < g.items.length; i++) ...[
                  if (i > 0) const Divider(height: 1, indent: 16, endIndent: 16),
                  ListTile(
                    onTap: () => g.items[i].push ? context.push(g.items[i].route) : context.go(g.items[i].route),
                    leading: Container(width: 42, height: 42, decoration: BoxDecoration(color: g.items[i].bg, borderRadius: BorderRadius.circular(12)), child: Icon(g.items[i].icon, size: 22, color: g.items[i].color)),
                    title: Text(g.items[i].label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    subtitle: Text(g.items[i].desc, style: const TextStyle(fontSize: 12, color: AppColors.outline)),
                    trailing: const Icon(Icons.chevron_right, color: Color(0xFFD1D5DB)),
                  ),
                ],
              ]),
            ),
          ],
        ],
      ),
    );
  }
}
