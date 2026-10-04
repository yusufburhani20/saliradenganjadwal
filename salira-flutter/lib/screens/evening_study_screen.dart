import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../models/models.dart';
import '../services/api_services.dart';

const _statuses = ['hadir', 'sakit', 'izin', 'alpha', 'terlambat'];

class _Cfg {
  final String label;
  final String short;
  final Color color;
  final Color bg;
  const _Cfg(this.label, this.short, this.color, this.bg);
}

const _cfg = {
  'hadir': _Cfg('Hadir', 'H', Color(0xFF059669), Color(0xFFECFDF5)),
  'sakit': _Cfg('Sakit', 'S', Color(0xFFD97706), Color(0xFFFFFBEB)),
  'izin': _Cfg('Izin', 'I', Color(0xFF2563EB), Color(0xFFEFF6FF)),
  'alpha': _Cfg('Alpha', 'A', Color(0xFFDC2626), Color(0xFFFEF2F2)),
  'terlambat': _Cfg('Terlambat', 'T', Color(0xFFF97316), Color(0xFFFFF7ED)),
};

class EveningStudyScreen extends StatefulWidget {
  const EveningStudyScreen({super.key});

  @override
  State<EveningStudyScreen> createState() => _EveningStudyScreenState();
}

class _EveningStudyScreenState extends State<EveningStudyScreen> {
  List<EveningItem> _records = [];
  List<SimpleItem> _classes = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    EveningStudyService.classes().then((c) {
      if (mounted) setState(() => _classes = c);
    }).catchError((_) {});
  }

  Future<void> _load() async {
    try {
      final r = await EveningStudyService.getAll();
      if (mounted) setState(() => _records = r);
    } catch (_) {
      // abaikan
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openForm({EveningItem? edit}) async {
    List<EveningAttendanceRow>? existing;
    if (edit != null) {
      try {
        existing = await EveningStudyService.detailAttendance(edit.id);
      } catch (e) {
        if (mounted) showSnack(context, errorMessage(e, 'Gagal memuat detail'), error: true);
        return;
      }
    }
    if (!mounted) return;
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _EveningForm(classes: _classes, edit: edit, existing: existing),
    );
    if (saved == true) _load();
  }

  Future<void> _delete(EveningItem item) async {
    if (!await confirmDialog(context, 'Hapus jurnal belajar malam ini?')) return;
    try {
      await EveningStudyService.delete(item.id);
      _load();
    } catch (e) {
      if (mounted) showSnack(context, errorMessage(e, 'Gagal menghapus'), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalHadir = _records.fold<int>(0, (s, r) => s + r.hadirCount);
    final avg = _records.isEmpty
        ? 0
        : (_records.fold<double>(0, (s, r) => s + r.hadirCount / (r.totalStudents < 1 ? 1 : r.totalStudents) * 100) / _records.length).round();

    Widget statItem(String v, String l) => Expanded(
          child: Column(children: [
            Text(v, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
            Text(l, style: const TextStyle(fontSize: 11, color: Colors.white70)),
          ]),
        );

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Column(children: [
        Container(
          padding: EdgeInsets.fromLTRB(8, MediaQuery.of(context).padding.top + 8, 8, 14),
          decoration: const BoxDecoration(color: AppColors.violet),
          child: Column(children: [
            Row(children: [
              IconButton(icon: const Icon(Icons.arrow_back, color: Colors.white), onPressed: () => context.canPop() ? context.pop() : context.go('/beranda')),
              const Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Belajar Malam', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
                  Text('Jurnal & absensi malam hari', style: TextStyle(fontSize: 11, color: Colors.white70)),
                ]),
              ),
              IconButton(icon: const Icon(Icons.add, color: Colors.white), onPressed: () => _openForm()),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              statItem('${_records.length}', 'Total Sesi'),
              statItem('$totalHadir', 'Total Hadir'),
              statItem('$avg%', 'Rata-rata'),
            ]),
          ]),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.violet))
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppColors.violet,
                  child: _records.isEmpty
                      ? ListView(children: [
                          const SizedBox(height: 40),
                          const EmptyState(icon: Icons.nightlight_outlined, color: AppColors.violet, title: 'Belum Ada Jurnal', text: 'Tap tombol + di atas untuk mencatat sesi belajar malam pertama Anda.'),
                          Center(child: FilledButton(onPressed: () => _openForm(), style: FilledButton.styleFrom(backgroundColor: AppColors.violet), child: const Text('+ Buat Jurnal Baru'))),
                        ])
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                          itemCount: _records.length,
                          itemBuilder: (_, i) => _card(_records[i]),
                        ),
                ),
        ),
      ]),
    );
  }

  Widget _card(EveningItem r) {
    Widget stat(String emoji, Color bg, String v, String l, {Color? vc}) => Padding(
          padding: const EdgeInsets.only(right: 16),
          child: Row(children: [
            Container(width: 32, height: 32, alignment: Alignment.center, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)), child: Text(emoji)),
            const SizedBox(width: 6),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(v, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: vc)),
              Text(l, style: const TextStyle(fontSize: 10, color: AppColors.outline)),
            ]),
          ]),
        );

    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: const Color(0xFFFAF5FF), borderRadius: BorderRadius.circular(8)),
            child: const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.nightlight_round, size: 12, color: AppColors.violet),
              SizedBox(width: 4),
              Text('Belajar Malam', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.violet)),
            ]),
          ),
          Text(r.date, style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
        ]),
        const SizedBox(height: 8),
        Text(r.activityName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        if (r.className != null) Text('📚 ${r.className}', style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
        const SizedBox(height: 10),
        Row(children: [
          stat('✅', const Color(0xFFECFDF5), '${r.hadirCount}', 'Hadir'),
          if (r.alphaCount > 0) stat('❌', const Color(0xFFFEF2F2), '${r.alphaCount}', 'Alpha', vc: const Color(0xFFDC2626)),
          stat('👥', const Color(0xFFF0F9FF), '${r.totalStudents}', 'Total'),
        ]),
        if (r.notes != null && r.notes!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(r.notes!, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppColors.outline)),
        ],
        const SizedBox(height: 8),
        Row(children: [
          TextButton.icon(onPressed: () => _openForm(edit: r), icon: const Icon(Icons.edit_outlined, size: 14, color: AppColors.violet), label: const Text('Edit', style: TextStyle(color: AppColors.violet))),
          TextButton.icon(onPressed: () => _delete(r), icon: const Icon(Icons.delete_outline, size: 14, color: Color(0xFFDC2626)), label: const Text('Hapus', style: TextStyle(color: Color(0xFFDC2626)))),
        ]),
      ]),
    );
  }
}

/// Form 3 langkah: Info -> Absensi -> Selesai (ringkasan).
class _EveningForm extends StatefulWidget {
  final List<SimpleItem> classes;
  final EveningItem? edit;
  final List<EveningAttendanceRow>? existing;
  const _EveningForm({required this.classes, this.edit, this.existing});

  @override
  State<_EveningForm> createState() => _EveningFormState();
}

class _EveningFormState extends State<_EveningForm> {
  int _step = 1;
  SimpleItem? _class;
  String _date = todayIso();
  final _activity = TextEditingController();
  final _notes = TextEditingController();
  List<EveningAttendanceRow> _rows = [];
  bool _loadingStudents = false;
  bool _submitting = false;
  String _error = '';

  bool get _editing => widget.edit != null;

  @override
  void initState() {
    super.initState();
    final e = widget.edit;
    if (e != null) {
      _date = e.date;
      _activity.text = e.activityName;
      _notes.text = e.notes ?? '';
      _rows = widget.existing ?? [];
    }
  }

  @override
  void dispose() {
    _activity.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickClass() async {
    final c = await showSelectorSheet(context, title: 'Pilih Kelas', items: widget.classes, selectedId: _class?.id);
    if (c == null) return;
    setState(() {
      _class = c;
      _loadingStudents = true;
    });
    try {
      final studs = await EveningStudyService.students(c.id);
      setState(() => _rows = [for (final s in studs) EveningAttendanceRow(studentId: s.id, name: s.name)]);
    } catch (e) {
      setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _loadingStudents = false);
    }
  }

  void _next() {
    if (_step == 1) {
      if (_activity.text.trim().isEmpty || _date.isEmpty) {
        setState(() => _error = 'Tanggal dan nama kegiatan wajib diisi.');
        return;
      }
      if (!_editing && _class == null) {
        setState(() => _error = 'Pilih kelas terlebih dahulu.');
        return;
      }
      if (_rows.isEmpty && !_editing) {
        setState(() => _error = 'Pilih kelas untuk mengisi absensi.');
        return;
      }
    }
    setState(() {
      _error = '';
      _step++;
    });
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = '';
    });
    try {
      final payload = <String, dynamic>{
        'date': _date,
        'activity_name': _activity.text.trim(),
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
        'attendance': [
          for (final r in _rows)
            {'student_id': r.studentId, 'status': r.status, if (r.notes.isNotEmpty) 'notes': r.notes},
        ],
      };
      if (_editing) {
        await EveningStudyService.update(widget.edit!.id, payload);
      } else {
        await EveningStudyService.create({...payload, 'academic_class_id': _class!.id});
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() {
        _error = errorMessage(e, 'Gagal menyimpan data.');
        _step = 1;
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
          child: Row(children: [
            IconButton(
              icon: Icon(_step > 1 ? Icons.arrow_back : Icons.close),
              onPressed: () => _step > 1 ? setState(() => _step--) : Navigator.pop(context),
            ),
            Expanded(child: Center(child: Text(_editing ? 'Edit Jurnal' : 'Buat Jurnal Baru', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)))),
            const SizedBox(width: 48),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(children: [for (final s in [1, 2, 3]) _StepDot(step: s, current: _step)]),
        ),
        Expanded(
          child: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 16), children: [
            if (_error.isNotEmpty) ErrorBox(_error),
            if (_step == 1) ..._stepInfo(),
            if (_step == 2) ..._stepAttendance(),
            if (_step == 3) ..._stepSummary(),
          ]),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: AppColors.violet),
                onPressed: _submitting ? null : (_step < 3 ? _next : _submit),
                child: _submitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_step < 3 ? 'Lanjut' : 'Simpan Jurnal'),
              ),
            ),
          ),
        ),
      ]),
    );
  }

  List<Widget> _stepInfo() => [
        const FormLabel('Tanggal'),
        DateField(value: _date, onChanged: (v) => setState(() => _date = v)),
        if (!_editing) ...[
          const FormLabel('Kelas'),
          SelectField(value: _class?.name, placeholder: '-- Pilih Kelas --', onTap: _pickClass),
        ],
        const FormLabel('Nama Kegiatan'),
        TextField(controller: _activity, decoration: const InputDecoration(hintText: 'Contoh: Muroja\'ah Kitab Kuning')),
        const FormLabel('Catatan'),
        TextField(controller: _notes, maxLines: 3, decoration: const InputDecoration(hintText: 'Catatan kegiatan (opsional)')),
        if (_loadingStudents) const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator())),
      ];

  List<Widget> _stepAttendance() => [
        Row(children: [
          Expanded(child: Text('${_rows.length} siswa', style: const TextStyle(fontWeight: FontWeight.w700))),
          TextButton(
            onPressed: () => setState(() {
              for (final r in _rows) {
                r.status = 'hadir';
              }
            }),
            child: const Text('Semua Hadir'),
          ),
        ]),
        for (var i = 0; i < _rows.length; i++)
          Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.surfaceLow, borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              Row(children: [
                SizedBox(width: 24, child: Text('${i + 1}', style: const TextStyle(fontSize: 12, color: AppColors.outline))),
                Expanded(child: Text(_rows[i].name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700))),
              ]),
              const SizedBox(height: 8),
              Row(children: [
                for (final s in _statuses)
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _rows[i].status = s),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: _rows[i].status == s ? _cfg[s]!.color : _cfg[s]!.bg, borderRadius: BorderRadius.circular(8)),
                        child: Text(_cfg[s]!.short, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: _rows[i].status == s ? Colors.white : _cfg[s]!.color)),
                      ),
                    ),
                  ),
              ]),
            ]),
          ),
      ];

  List<Widget> _stepSummary() {
    int c(String s) => _rows.where((r) => r.status == s).length;
    return [
      AppCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_activity.text, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          Text('$_date${_class != null ? ' · ${_class!.name}' : ''}', style: const TextStyle(color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final s in _statuses)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: _cfg[s]!.bg, borderRadius: BorderRadius.circular(99)),
                child: Text('${_cfg[s]!.label}: ${c(s)}', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: _cfg[s]!.color)),
              ),
          ]),
        ]),
      ),
    ];
  }
}

class _StepDot extends StatelessWidget {
  final int step;
  final int current;
  const _StepDot({required this.step, required this.current});

  @override
  Widget build(BuildContext context) {
    final done = current > step;
    final active = current == step;
    return Expanded(
      child: Column(children: [
        Container(
          width: 28, height: 28, alignment: Alignment.center,
          decoration: BoxDecoration(shape: BoxShape.circle, color: (done || active) ? AppColors.violet : const Color(0xFFE5E7EB)),
          child: done
              ? const Icon(Icons.check, size: 14, color: Colors.white)
              : Text('$step', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: active ? Colors.white : const Color(0xFF9CA3AF))),
        ),
        const SizedBox(height: 3),
        Text(step == 1 ? 'Info' : step == 2 ? 'Absensi' : 'Selesai', style: TextStyle(fontSize: 9, color: (active || done) ? AppColors.violet : const Color(0xFF9CA3AF))),
      ]),
    );
  }
}
