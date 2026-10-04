import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    Widget info(IconData icon, String label, String? value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, size: 20, color: const Color(0xFF2563EB)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                Text((value == null || value.isEmpty) ? '-' : value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              ]),
            ),
          ]),
        );

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: ListView(padding: EdgeInsets.zero, children: [
        Container(
          padding: EdgeInsets.fromLTRB(16, MediaQuery.of(context).padding.top + 8, 16, 28),
          decoration: const BoxDecoration(
            color: Color(0xFF2563EB),
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
          ),
          child: Column(children: [
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => context.canPop() ? context.pop() : context.go('/beranda'),
              ),
            ),
            CircleAvatar(
              radius: 40,
              backgroundColor: Colors.white24,
              child: Text(
                (user?.name.isNotEmpty ?? false) ? user!.name[0].toUpperCase() : 'G',
                style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: Colors.white),
              ),
            ),
            const SizedBox(height: 12),
            Text(user?.name ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
            const SizedBox(height: 8),
            Wrap(spacing: 6, runSpacing: 6, alignment: WrapAlignment.center, children: [
              for (final r in user?.roles ?? <String>[])
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(99)),
                  child: Text(r, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
            ]),
          ]),
        ),
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Informasi Akun', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            info(Icons.mail_outline, 'Email', user?.email),
            info(Icons.badge_outlined, 'NIP', user?.nip),
            info(Icons.call_outlined, 'Telepon', user?.phone),
            info(Icons.verified_user_outlined, 'Status', user?.status),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () => context.read<AuthProvider>().logout(),
            icon: const Icon(Icons.logout, size: 20),
            label: const Text('Keluar'),
          ),
        ),
        const SizedBox(height: 32),
      ]),
    );
  }
}
