import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../core/widgets.dart';
import '../models/models.dart';
import '../services/api_services.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<AppNotification> _items = [];
  int _unread = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final page = await NotificationService.getAll();
      if (!mounted) return;
      setState(() {
        _items = page.data;
        _unread = page.unreadCount;
      });
    } catch (_) {
      // abaikan
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markRead(AppNotification n) async {
    if (n.readAt != null) return;
    await NotificationService.markAsRead(n.id);
    setState(() {
      _items = _items.map((e) => e.id == n.id ? e.markRead() : e).toList();
      _unread = (_unread - 1).clamp(0, 1 << 30);
    });
  }

  Future<void> _markAll() async {
    await NotificationService.markAllAsRead();
    setState(() {
      _items = _items.map((e) => e.markRead()).toList();
      _unread = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Column(children: [
        Container(
          color: Colors.white,
          padding: EdgeInsets.fromLTRB(16, MediaQuery.of(context).padding.top + 12, 16, 12),
          child: Row(children: [
            const Expanded(child: Text('Notifikasi', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
            if (_unread > 0)
              TextButton(onPressed: _markAll, child: const Text('Tandai semua dibaca')),
          ]),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _items.isEmpty
                      ? ListView(children: const [
                          EmptyState(icon: Icons.notifications_off_outlined, title: 'Belum ada notifikasi', text: ''),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
                          itemCount: _items.length,
                          itemBuilder: (_, i) {
                            final n = _items[i];
                            final unread = n.readAt == null;
                            return InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: () => _markRead(n),
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: unread ? const Color(0xFFEFF6FF) : Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: unread ? const Color(0xFFBFDBFE) : const Color(0xFFE5E7EB)),
                                ),
                                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Container(
                                    margin: const EdgeInsets.only(top: 5, right: 10),
                                    width: 10, height: 10,
                                    decoration: BoxDecoration(shape: BoxShape.circle, color: unread ? const Color(0xFF2563EB) : const Color(0xFFD1D5DB)),
                                  ),
                                  Expanded(
                                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                      Text(n.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                                      const SizedBox(height: 2),
                                      Text(n.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant)),
                                      const SizedBox(height: 4),
                                      if (n.createdAt != null)
                                        Text(formatDateId(n.createdAt!.toLocal(), 'd MMM yyyy HH:mm'), style: const TextStyle(fontSize: 11, color: AppColors.outline)),
                                    ]),
                                  ),
                                ]),
                              ),
                            );
                          },
                        ),
                ),
        ),
      ]),
    );
  }
}
