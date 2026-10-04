import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../models/models.dart';
import '../services/api_services.dart';

const _leaveTypes = {
  'izin': 'Izin',
  'sakit': 'Sakit',
  'dinas_luar': 'Dinas Luar',
  'cuti': 'Cuti',
};

const _statusColor = {
  'pending': Color(0xFFF59E0B),
  'approved': Color(0xFF10B981),
  'rejected': Color(0xFFEF4444),
};

const _statusLabel = {
  'pending': 'Menunggu',
  'approved': 'Disetujui',
  'rejected': 'Ditolak',
};

class LeaveScreen extends StatefulWidget {
  const LeaveScreen({super.key});

  @override
  State<LeaveScreen> createState() => _LeaveScreenState();
}

class _LeaveScreenState extends State<LeaveScreen> {
  List<Leave> _leaves = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final l = await LeaveService.getAll();
      if (mounted) setState(() => _leaves = l);
    } catch (_) {
      // abaikan
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _delete(Leave l) async {
    try {
      await LeaveService.delete(l.id);
      setState(() => _leaves.removeWhere((e) => e.id == l.id));
    } catch (e) {
      showSnack(context, errorMessage(e, 'Gagal membatalkan'), error: true);
    }
  }

  Future<void> _openForm() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => const _LeaveForm(),
    );
    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    int count(String s) => _leaves.where((l) => l.status == s).length;

    Widget resume(String label, int n, Color fg, Color bg) => Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              Text('$n', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: fg)),
              Text(label, style: const TextStyle(fontSize: 10, color: AppColors.onSurfaceVariant)),
            ]),
          ),
        );

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Column(children: [
        Container(
          padding: EdgeInsets.fromLTRB(8, MediaQuery.of(context).padding.top + 8, 16, 14),
          decoration: const BoxDecoration(color: Color(0xFF2563EB)),
          child: Row(children: [
            IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => context.canPop() ? context.pop() : context.go('/beranda'),
            ),
            const Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Perizinan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
                Text('Kelola izin & cuti Anda', style: TextStyle(fontSize: 11, color: Colors.white70)),
              ]),
            ),
            FilledButton.icon(
              onPressed: _openForm,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Ajukan'),
              style: FilledButton.styleFrom(backgroundColor: Colors.white24, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10)),
            ),
          ]),
        ),
        if (!_loading)
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Ringkasan Perizinan Tahun Ini', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
              const SizedBox(height: 10),
              Row(children: [
                resume('⏳ Menunggu', count('pending'), const Color(0xFFD97706), const Color(0xFFFFFBEB)),
                const SizedBox(width: 6),
                resume('✅ Disetujui', count('approved'), const Color(0xFF059669), const Color(0xFFECFDF5)),
                const SizedBox(width: 6),
                resume('❌ Ditolak', count('rejected'), const Color(0xFFDC2626), const Color(0xFFFEF2F2)),
                const SizedBox(width: 6),
                resume('📋 Total', _leaves.length, const Color(0xFF0891B2), const Color(0xFFF0F9FF)),
              ]),
            ]),
          ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _leaves.isEmpty
                      ? ListView(children: const [
                          EmptyState(icon: Icons.description_outlined, title: 'Belum ada perizinan', text: 'Tap tombol "Ajukan" di atas untuk membuat permohonan.'),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: _leaves.length,
                          itemBuilder: (_, i) {
                            final l = _leaves[i];
                            final c = _statusColor[l.status] ?? AppColors.outline;
                            return AppCard(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(8)),
                                    child: Text(_leaveTypes[l.type] ?? l.type, style: const TextStyle(color: Color(0xFF2563EB), fontWeight: FontWeight.w700, fontSize: 12)),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(color: c.withValues(alpha: .13), borderRadius: BorderRadius.circular(8)),
                                    child: Text(_statusLabel[l.status] ?? l.status, style: TextStyle(color: c, fontWeight: FontWeight.w700, fontSize: 12)),
                                  ),
                                ]),
                                const SizedBox(height: 8),
                                Row(children: [
                                  const Icon(Icons.calendar_today_outlined, size: 13, color: Color(0xFF6B7280)),
                                  const SizedBox(width: 4),
                                  Text('${l.startDate} — ${l.endDate}', style: const TextStyle(fontSize: 13, color: Color(0xFF374151))),
                                ]),
                                const SizedBox(height: 4),
                                Text(l.reason, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant)),
                                if (l.status == 'pending')
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton(
                                      onPressed: () => _delete(l),
                                      child: const Text('Batalkan', style: TextStyle(color: AppColors.error)),
                                    ),
                                  ),
                              ]),
                            );
                          },
                        ),
                ),
        ),
      ]),
    );
  }
}

class _LeaveForm extends StatefulWidget {
  const _LeaveForm();

  @override
  State<_LeaveForm> createState() => _LeaveFormState();
}

class _LeaveFormState extends State<_LeaveForm> {
  String _type = 'izin';
  String _start = '';
  String _end = '';
  final _reason = TextEditingController();
  bool _submitting = false;
  String _error = '';

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_start.isEmpty || _end.isEmpty || _reason.text.trim().isEmpty) {
      setState(() => _error = 'Semua field harus diisi');
      return;
    }
    setState(() {
      _submitting = true;
      _error = '';
    });
    try {
      await LeaveService.create(type: _type, startDate: _start, endDate: _end, reason: _reason.text.trim());
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => _error = errorMessage(e, 'Gagal mengajukan perizinan'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            const Expanded(child: Text('Ajukan Perizinan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
            IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
          ]),
          if (_error.isNotEmpty) ErrorBox(_error),
          const FormLabel('Jenis Izin'),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final e in _leaveTypes.entries)
              ChoiceChip(
                label: Text(e.value),
                selected: _type == e.key,
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(color: _type == e.key ? Colors.white : AppColors.onSurface, fontWeight: FontWeight.w600),
                onSelected: (_) => setState(() => _type = e.key),
              ),
          ]),
          const FormLabel('Tanggal Mulai'),
          DateField(value: _start, onChanged: (v) => setState(() => _start = v)),
          const FormLabel('Tanggal Selesai'),
          DateField(value: _end, onChanged: (v) => setState(() => _end = v)),
          const FormLabel('Alasan'),
          TextField(controller: _reason, maxLines: 4, decoration: const InputDecoration(hintText: 'Jelaskan alasan perizinan...')),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Ajukan Perizinan'),
          ),
        ]),
      ),
    );
  }
}
