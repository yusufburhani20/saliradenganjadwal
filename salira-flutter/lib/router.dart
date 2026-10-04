import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';
import 'screens/agenda_screen.dart';
import 'screens/all_menu_screen.dart';
import 'screens/assessment_screen.dart';
import 'screens/attendance_history_screen.dart';
import 'screens/attendance_screen.dart';
import 'screens/counseling_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/evening_study_screen.dart';
import 'screens/leave_screen.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';
import 'screens/notification_screen.dart';
import 'screens/profile_screen.dart';

/// Padanan `Router.tsx`: tab bawah (Beranda…Notifikasi) + halaman stack.
GoRouter buildRouter(AuthProvider auth) {
  return GoRouter(
    initialLocation: '/beranda',
    refreshListenable: auth,
    redirect: (context, state) {
      final atSplash = state.matchedLocation == '/splash';
      if (auth.isLoading) return atSplash ? null : '/splash';
      final loggedIn = auth.user != null;
      final atLogin = state.matchedLocation == '/login';
      if (!loggedIn && !atLogin) return '/login';
      if (loggedIn && (atLogin || atSplash)) return '/beranda';
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (_, __) => const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      ),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => MainShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/beranda', builder: (_, __) => const DashboardScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/presensi', builder: (_, __) => const AttendanceScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/jurnal', builder: (_, __) => const AgendaScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/penilaian', builder: (_, __) => const AssessmentScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/bimbingan', builder: (_, __) => const CounselingScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/notifikasi', builder: (_, __) => const NotificationScreen()),
          ]),
        ],
      ),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(path: '/leave', builder: (_, __) => const LeaveScreen()),
      GoRoute(path: '/attendance-history', builder: (_, __) => const AttendanceHistoryScreen()),
      GoRoute(path: '/evening-study', builder: (_, __) => const EveningStudyScreen()),
      GoRoute(path: '/all-menu', builder: (_, __) => const AllMenuScreen()),
    ],
    errorBuilder: (_, state) => Scaffold(body: Center(child: Text('Halaman tidak ditemukan: ${state.uri}'))),
  );
}
