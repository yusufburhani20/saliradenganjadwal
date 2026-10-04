import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/theme.dart';

/// Tab bawah mengambang (padanan `MainTabs` di Router.tsx).
class MainShell extends StatelessWidget {
  final StatefulNavigationShell shell;
  const MainShell({super.key, required this.shell});

  static const _tabs = [
    (label: 'Beranda', icon: Icons.home_outlined, active: Icons.home),
    (label: 'Presensi', icon: Icons.fingerprint, active: Icons.fingerprint),
    (label: 'Jurnal', icon: Icons.menu_book_outlined, active: Icons.menu_book),
    (label: 'Penilaian', icon: Icons.assignment_outlined, active: Icons.assignment),
    (label: 'Bimbingan', icon: Icons.chat_bubble_outline, active: Icons.chat_bubble),
    (label: 'Notifikasi', icon: Icons.notifications_outlined, active: Icons.notifications),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Material(
            elevation: 10,
            shadowColor: Colors.black26,
            borderRadius: BorderRadius.circular(24),
            clipBehavior: Clip.antiAlias,
            child: NavigationBar(
              selectedIndex: shell.currentIndex,
              labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
              onDestinationSelected: (i) =>
                  shell.goBranch(i, initialLocation: i == shell.currentIndex),
              destinations: [
                for (final t in _tabs)
                  NavigationDestination(
                    icon: Icon(t.icon, color: const Color(0xFF94A3B8)),
                    selectedIcon: Icon(t.active, color: const Color(0xFF2563EB)),
                    label: t.label,
                  ),
              ],
            ),
          ),
        ),
      ),
      backgroundColor: AppColors.surface,
    );
  }
}
