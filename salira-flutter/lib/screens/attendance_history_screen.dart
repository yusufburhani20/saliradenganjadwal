import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/config.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../providers/attendance_controller.dart';

class AttendanceHistoryScreen extends StatefulWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  State<AttendanceHistoryScreen> createState() => _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen> {
  final _ctrl = AttendanceController();
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _ctrl.fetchHistory();
    _scroll.addListener(() {
      if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 300) _ctrl.loadMore();
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        centerTitle: true,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        title: const Text('Riwayat Absensi', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: ListenableBuilder(
        listenable: _ctrl,
        builder: (context, _) {
          if (_ctrl.isLoadingHistory && _ctrl.history.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          return RefreshIndicator(
            onRefresh: () => _ctrl.fetchHistory(refresh: true),
            child: _ctrl.history.isEmpty
                ? ListView(children: const [
                    Padding(padding: EdgeInsets.all(48), child: Center(child: Text('Belum ada riwayat absensi.', style: TextStyle(color: AppColors.outline)))),
                  ])
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(16),
                    itemCount: _ctrl.history.length + (_ctrl.isFetchingMore ? 1 : 0),
                    itemBuilder: (_, i) {
                      if (i >= _ctrl.history.length) {
                        return const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
                      }
                      final h = _ctrl.history[i];
                      final c = attendanceStatusColor(h.status);
                      return AppCard(
                        child: Column(children: [
                          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                            Text(h.date, style: const TextStyle(fontWeight: FontWeight.w800)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(color: c.withValues(alpha: .13), borderRadius: BorderRadius.circular(8)),
                              child: Text(h.status.toUpperCase(), style: TextStyle(color: c, fontSize: 11, fontWeight: FontWeight.w800)),
                            ),
                          ]),
                          const SizedBox(height: 10),
                          Row(children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: SizedBox(
                                width: 64, height: 64,
                                child: h.photoUrl != null
                                    ? Image.network(AppConfig.storageUrl(h.photoUrl!), fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => _noPhoto())
                                    : _noPhoto(),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Row(children: [
                                  _time(Icons.login, AppColors.secondary, 'Masuk', h.checkIn),
                                  const SizedBox(width: 20),
                                  _time(Icons.logout, AppColors.tertiary, 'Pulang', h.checkOut),
                                ]),
                                if (h.latitude != null && h.longitude != null) ...[
                                  const SizedBox(height: 6),
                                  Row(children: [
                                    const Icon(Icons.location_on, size: 14, color: AppColors.primary),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        '${(double.tryParse(h.latitude!) ?? 0).toStringAsFixed(4)}, ${(double.tryParse(h.longitude!) ?? 0).toStringAsFixed(4)}',
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
                                      ),
                                    ),
                                  ]),
                                ],
                              ]),
                            ),
                          ]),
                        ]),
                      );
                    },
                  ),
          );
        },
      ),
    );
  }

  Widget _noPhoto() => const ColoredBox(color: AppColors.surfaceLow, child: Icon(Icons.image_not_supported, color: AppColors.outline));

  Widget _time(IconData icon, Color color, String label, String? v) => Row(children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 10, color: AppColors.outline)),
          Text(v ?? '--:--', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
        ]),
      ]);
}
