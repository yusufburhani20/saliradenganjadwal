import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../models/models.dart';
import '../services/api_services.dart';

const _filterCategories = ['Semua', 'Kedisiplinan', 'Akademik', 'Karakter / Akhlaq', 'Keluarga & Sosial'];

class CounselingScreen extends StatefulWidget {
  const CounselingScreen({super.key});

  @override
  State<CounselingScreen> createState() => _CounselingScreenState();
}

class _CounselingScreenState extends State<CounselingScreen> {
  List<Consultation> _items = [];
  ConsultationFormData _form = const ConsultationFormData([], [], []);
  bool _loading = true;
  String _filter = 'Semua';
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final items = await ConsultationService.getAll();
      final form = await ConsultationService.formData();
      if (!mounted) return;
      setState(() {
        _items = items;
        _form = form;
      });
    } catch (_) {
      // abaikan
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openForm() async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(fullscreenDialog: true, builder: (_) => _ConsultationForm(form: _form)),
    );
    if (saved == true) _load();
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((e) => e.isNotEmpty);
    final s = parts.map((e) => e[0]).take(2).join().toUpperCase();
    return s.isEmpty ? 'S' : s;
  }

  @override
  Widget build(BuildContext context) {
    final q = _query.toLowerCase();
    final list = _items.where((c) {
      final cat = _filter == 'Semua' || c.category == _filter;
      final search = (c.studentName ?? '').toLowerCase().contains(q) || c.description.toLowerCase().contains(q);
      return cat && search;
    }).toList();
    final process = _items.where((c) => c.followUpStatus == 'Dalam Proses' || c.followUpStatus == 'Pending').length;
    final done = _items.where((c) => c.followUpStatus == 'Selesai').length;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        TabHeader(title: 'Bimbingan Siswa', actionLabel: 'Konsultasi', onAction: _openForm),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
              children: [
                GradientBanner(
                  tag: 'BIMBINGAN & KONSELING',
                  title: 'Konsultasi Siswa',
                  desc: 'Catat dan pantau tindak lanjut bimbingan santri.',
                  stats: [
                    BannerStat('Total', '${_items.length}'),
                    BannerStat('Diproses', '$process', AppColors.tertiaryFixed),
                    BannerStat('Selesai', '$done', AppColors.secondaryContainer),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  onChanged: (v) => setState(() => _query = v),
                  decoration: const InputDecoration(hintText: 'Cari siswa atau catatan...', prefixIcon: Icon(Icons.search)),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 36,
                  child: ListView(scrollDirection: Axis.horizontal, children: [
                    for (final c in _filterCategories)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(c),
                          selected: _filter == c,
                          selectedColor: AppColors.primary,
                          labelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _filter == c ? Colors.white : AppColors.onSurfaceVariant),
                          onSelected: (_) => setState(() => _filter = c),
                        ),
                      ),
                  ]),
                ),
                const SizedBox(height: 12),
                if (_loading)
                  const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()))
                else if (list.isEmpty)
                  const EmptyState(icon: Icons.forum_outlined, title: 'Belum ada konsultasi', text: 'Tap tombol Konsultasi untuk mencatat bimbingan siswa.')
                else
                  for (final c in list) _card(c),
              ],
            ),
          ),
        ),
      ]),
    );
  }

  Widget _card(Consultation c) {
    final isDone = c.followUpStatus == 'Selesai';
    final isProcess = c.followUpStatus == 'Dalam Proses';
    final bg = isDone ? AppColors.secondaryContainer : isProcess ? AppColors.tertiaryFixed : AppColors.surfaceHigh;
    final fg = isDone ? AppColors.onSecondaryContainer : isProcess ? AppColors.tertiary : AppColors.onSurface;

    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(backgroundColor: isDone ? AppColors.secondaryContainer : isProcess ? AppColors.tertiaryFixed : AppColors.primaryFixed, child: Text(_initials(c.studentName ?? 'A'), style: TextStyle(fontWeight: FontWeight.w800, color: fg))),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(c.studentName ?? '-', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
              Text('${c.className ?? '-'} • ${c.consultationDate}', style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
            ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
            child: Text(c.followUpStatus ?? 'Pending', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: fg)),
          ),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: AppColors.surfaceLow, borderRadius: BorderRadius.circular(6)),
            child: Text(c.category, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary)),
          ),
        ]),
        const SizedBox(height: 6),
        Text(c.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant)),
        if (c.followUp != null && c.followUp!.isNotEmpty) ...[
          const Divider(height: 18),
          Row(children: [
            const Icon(Icons.handshake_outlined, size: 16, color: AppColors.secondary),
            const SizedBox(width: 6),
            Expanded(child: Text('Tindak Lanjut: ${c.followUp}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
          ]),
        ],
      ]),
    );
  }
}

class _ConsultationForm extends StatefulWidget {
  final ConsultationFormData form;
  const _ConsultationForm({required this.form});

  @override
  State<_ConsultationForm> createState() => _ConsultationFormState();
}

class _ConsultationFormState extends State<_ConsultationForm> {
  SimpleItem? _class;
  SimpleItem? _student;
  List<Student> _students = [];
  String _date = todayIso();
  String _category = '';
  String _status = 'Dalam Proses';
  final _desc = TextEditingController();
  final _followUp = TextEditingController();
  bool _submitting = false;
  String _error = '';

  @override
  void dispose() {
    _desc.dispose();
    _followUp.dispose();
    super.dispose();
  }

  Future<String?> _pickString(String title, List<String> options, String current) async {
    final r = await showSelectorSheet(
      context,
      title: title,
      items: [for (var i = 0; i < options.length; i++) SimpleItem(i, options[i])],
      selectedId: options.indexOf(current),
    );
    return r?.name;
  }

  Future<void> _submit() async {
    if (_class == null || _student == null || _category.isEmpty || _desc.text.trim().isEmpty) {
      setState(() => _error = 'Kelas, siswa, kategori, dan deskripsi wajib diisi');
      return;
    }
    setState(() {
      _submitting = true;
      _error = '';
    });
    try {
      await ConsultationService.create({
        'student_id': _student!.id,
        'academic_class_id': _class!.id,
        'consultation_date': _date,
        'category': _category,
        'description': _desc.text.trim(),
        if (_followUp.text.trim().isNotEmpty) 'follow_up': _followUp.text.trim(),
        if (_status.isNotEmpty) 'follow_up_status': _status,
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => _error = errorMessage(e, 'Gagal menyimpan'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Catat Konsultasi', style: TextStyle(fontWeight: FontWeight.w800)),
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
      ),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 120), children: [
        if (_error.isNotEmpty) ErrorBox(_error),
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const FormLabel('Kelas', required: true),
            SelectField(
              value: _class?.name,
              placeholder: '-- Pilih Kelas --',
              onTap: () async {
                final c = await showSelectorSheet(context, title: 'Pilih Kelas', items: widget.form.classes, selectedId: _class?.id);
                if (c == null) return;
                setState(() {
                  _class = c;
                  _student = null;
                  _students = [];
                });
                try {
                  final s = await ConsultationService.students(c.id);
                  setState(() => _students = s);
                } catch (e) {
                  setState(() => _error = 'Gagal memuat siswa: ${errorMessage(e)}');
                }
              },
            ),
            const FormLabel('Siswa', required: true),
            SelectField(
              value: _student?.name,
              placeholder: _class == null ? 'Pilih kelas dulu' : '-- Pilih Siswa --',
              onTap: () async {
                if (_class == null) return;
                final s = await showSelectorSheet(
                  context,
                  title: 'Pilih Siswa',
                  items: [for (final st in _students) SimpleItem(st.id, st.name)],
                  selectedId: _student?.id,
                );
                if (s != null) setState(() => _student = s);
              },
            ),
            const FormLabel('Tanggal', required: true),
            DateField(value: _date, onChanged: (v) => setState(() => _date = v)),
            const FormLabel('Kategori', required: true),
            SelectField(
              value: _category,
              placeholder: '-- Pilih Kategori --',
              onTap: () async {
                final c = await _pickString('Kategori', widget.form.categories, _category);
                if (c != null) setState(() => _category = c);
              },
            ),
            const FormLabel('Deskripsi / Catatan', required: true),
            TextField(controller: _desc, maxLines: 4, decoration: const InputDecoration(hintText: 'Uraikan hasil bimbingan...')),
            const FormLabel('Tindak Lanjut'),
            TextField(controller: _followUp, maxLines: 2, decoration: const InputDecoration(hintText: 'Rencana tindak lanjut (opsional)')),
            const FormLabel('Status Tindak Lanjut'),
            SelectField(
              value: _status,
              placeholder: '',
              onTap: () async {
                final opts = widget.form.followUpStatuses.isEmpty ? const ['Pending', 'Dalam Proses', 'Selesai'] : widget.form.followUpStatuses;
                final s = await _pickString('Status', opts, _status);
                if (s != null) setState(() => _status = s);
              },
            ),
          ]),
        ),
      ]),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton.icon(
            onPressed: _submitting ? null : _submit,
            icon: _submitting ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.check, size: 20),
            label: const Text('Simpan Konsultasi'),
          ),
        ),
      ),
    );
  }
}
