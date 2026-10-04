import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../models/models.dart';
import '../services/api_services.dart';

const _assessmentTypes = ['Tugas', 'Ulangan Harian', 'Kuis', 'Praktik', 'Lainnya'];
const _finalTypes = ['ASAS', 'ASAT'];

class AssessmentScreen extends StatefulWidget {
  const AssessmentScreen({super.key});

  @override
  State<AssessmentScreen> createState() => _AssessmentScreenState();
}

class _AssessmentScreenState extends State<AssessmentScreen> {
  bool _finalTab = false;
  bool _loading = true;
  List<Assessment> _daily = [];
  List<Assessment> _final = [];
  AgendaFormData _form = const AgendaFormData([], []);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await Future.wait([
        AssessmentService.getAll(),
        FinalAssessmentService.getAll(),
        AssessmentService.formData(),
      ]);
      if (!mounted) return;
      setState(() {
        _daily = r[0] as List<Assessment>;
        _final = r[1] as List<Assessment>;
        _form = r[2] as AgendaFormData;
      });
    } catch (_) {
      // abaikan
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openForm({Assessment? edit}) async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _AssessmentForm(form: _form, isFinal: _finalTab, edit: edit),
      ),
    );
    if (saved == true) _load();
  }

  Future<void> _delete(Assessment a) async {
    if (!await confirmDialog(context, 'Hapus penilaian "${a.title}"?')) return;
    try {
      if (_finalTab) {
        await FinalAssessmentService.delete(a.id);
      } else {
        await AssessmentService.delete(a.id);
      }
      _load();
    } catch (e) {
      if (mounted) showSnack(context, errorMessage(e, 'Gagal menghapus'), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final avg = _daily.fold<double>(0, (s, a) => s + (a.averageScore ?? 0)) / (_daily.isEmpty ? 1 : _daily.length);
    final participants = _daily.fold<int>(0, (s, a) => s + a.scoresCount);
    final list = _finalTab ? _final : _daily;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        TabHeader(title: 'Penilaian Kelas', actionLabel: 'Buat Nilai', onAction: () => _openForm()),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
              children: [
                GradientBanner(
                  tag: 'GURU MAPEL',
                  title: 'Penilaian Kelas',
                  desc: 'Input dan pantau hasil evaluasi belajar siswa dengan mudah.',
                  stats: [
                    BannerStat('Total Penilaian', '${_daily.length}'),
                    BannerStat('Rata-rata Kelas', avg.toStringAsFixed(1), const Color(0xFFFFB95F)),
                    BannerStat('Partisipasi', '$participants Siswa', const Color(0xFF6FFBBE)),
                  ],
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(color: AppColors.surfaceLow, borderRadius: BorderRadius.circular(10)),
                  child: Row(children: [
                    for (final (isFinal, label) in [(false, 'Harian'), (true, 'Ujian Akhir')])
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _finalTab = isFinal),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(color: _finalTab == isFinal ? AppColors.primary : Colors.transparent, borderRadius: BorderRadius.circular(8)),
                            child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _finalTab == isFinal ? Colors.white : AppColors.onSurfaceVariant)),
                          ),
                        ),
                      ),
                  ]),
                ),
                const SizedBox(height: 12),
                if (_loading)
                  const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()))
                else if (list.isEmpty)
                  EmptyState(
                    icon: _finalTab ? Icons.assignment_turned_in : Icons.fact_check,
                    title: _finalTab ? 'Belum ada penilaian akhir' : 'Belum ada penilaian harian',
                    text: _finalTab ? 'Tap tombol Buat Nilai untuk menginput nilai ujian semester (ASAS/ASAT).' : 'Tap tombol Buat Nilai untuk memasukkan nilai santri.',
                  )
                else
                  for (final a in list) _card(a),
              ],
            ),
          ),
        ),
      ]),
    );
  }

  Widget _card(Assessment a) {
    final accent = _finalTab ? const Color(0xFFD97706) : AppColors.primary;
    Widget stat(String v, String l) => Expanded(
          child: Column(children: [
            Text(v, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            Text(l, style: const TextStyle(fontSize: 10, color: AppColors.onSurfaceVariant)),
          ]),
        );

    return AppCard(
      accent: accent,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: accent.withValues(alpha: .1), borderRadius: BorderRadius.circular(6)),
            child: Text(a.type, style: TextStyle(color: accent, fontWeight: FontWeight.w800, fontSize: 12)),
          ),
          Text(a.date, style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
        ]),
        const SizedBox(height: 6),
        Text(a.title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        Text('${a.className ?? '-'} · ${a.subjectName ?? '-'}', style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(color: AppColors.surfaceLow, borderRadius: BorderRadius.circular(10)),
          child: Row(children: [
            stat('${a.scoresCount}', 'Siswa'),
            stat(a.averageScore?.toStringAsFixed(1) ?? '-', 'Rata-rata'),
            stat(a.kkm?.toStringAsFixed(0) ?? '-', 'KKM'),
          ]),
        ),
        Row(mainAxisAlignment: MainAxisAlignment.end, children: [
          if (_finalTab)
            TextButton.icon(onPressed: () => _openForm(edit: a), icon: const Icon(Icons.edit_outlined, size: 14), label: const Text('Edit')),
          TextButton.icon(
            onPressed: () => _delete(a),
            icon: const Icon(Icons.delete_outline, size: 14, color: AppColors.error),
            label: const Text('Hapus', style: TextStyle(color: AppColors.error)),
          ),
        ]),
      ]),
    );
  }
}

class _ScoreRow {
  final int studentId;
  final String name;
  final TextEditingController ctrl;
  _ScoreRow(this.studentId, this.name, [String score = '']) : ctrl = TextEditingController(text: score);
}

class _AssessmentForm extends StatefulWidget {
  final AgendaFormData form;
  final bool isFinal;
  final Assessment? edit;
  const _AssessmentForm({required this.form, required this.isFinal, this.edit});

  @override
  State<_AssessmentForm> createState() => _AssessmentFormState();
}

class _AssessmentFormState extends State<_AssessmentForm> {
  SimpleItem? _class;
  SimpleItem? _subject;
  String _date = todayIso();
  String _type = 'Tugas';
  final _title = TextEditingController();
  final _kkm = TextEditingController();
  List<_ScoreRow> _scores = [];
  bool _submitting = false;
  String _error = '';

  bool get _editing => widget.edit != null;

  @override
  void initState() {
    super.initState();
    _type = widget.isFinal ? 'ASAS' : 'Tugas';
    final e = widget.edit;
    if (e != null) {
      _date = e.date;
      _title.text = e.title;
      _kkm.text = e.kkm?.toStringAsFixed(0) ?? '';
      _type = e.type;
      _class = SimpleItem(e.academicClassId, e.className ?? '');
      _subject = SimpleItem(e.subjectId, e.subjectName ?? '');
      _scores = [
        for (final s in e.scores)
          _ScoreRow(int.tryParse('${s['student_id']}') ?? 0, '${s['student_name'] ?? ''}', '${s['score'] ?? ''}'),
      ];
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _kkm.dispose();
    for (final s in _scores) {
      s.ctrl.dispose();
    }
    super.dispose();
  }

  Future<void> _pickClass() async {
    final c = await showSelectorSheet(context, title: 'Pilih Kelas', items: widget.form.classes, selectedId: _class?.id);
    if (c == null) return;
    setState(() => _class = c);
    try {
      final studs = await AssessmentService.students(c.id);
      setState(() => _scores = [for (final s in studs) _ScoreRow(s.id, s.name)]);
    } catch (e) {
      setState(() => _error = 'Gagal memuat siswa: ${errorMessage(e)}');
    }
  }

  Future<void> _submit() async {
    if (_class == null || _subject == null || _title.text.trim().isEmpty) {
      setState(() => _error = 'Kelas, mapel, dan judul harus diisi');
      return;
    }
    setState(() {
      _submitting = true;
      _error = '';
    });
    try {
      final kkm = int.tryParse(_kkm.text.trim());
      final scores = [
        for (final s in _scores)
          if (s.ctrl.text.trim().isNotEmpty && double.tryParse(s.ctrl.text.trim()) != null)
            {'student_id': s.studentId, 'score': double.parse(s.ctrl.text.trim())},
      ];
      if (widget.isFinal) {
        final payload = {
          'academic_class_id': _class!.id,
          'subject_id': _subject!.id,
          'date': _date,
          'type': _type,
          'title': _title.text.trim(),
          if (kkm != null) 'kkm': kkm,
          'scores': scores,
        };
        if (_editing) {
          payload.remove('academic_class_id');
          payload.remove('subject_id');
          await FinalAssessmentService.update(widget.edit!.id, payload);
        } else {
          await FinalAssessmentService.create(payload);
        }
      } else {
        await AssessmentService.create({
          'academic_class_id': _class!.id,
          'subject_id': _subject!.id,
          'date': _date,
          'type': _type,
          'title': _title.text.trim(),
          if (kkm != null) 'kkm': kkm,
          'scores': scores,
        });
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => _error = errorMessage(e, 'Gagal menyimpan'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final types = widget.isFinal ? _finalTypes : _assessmentTypes;
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: Text(_editing ? 'Edit Penilaian' : 'Buat Penilaian Baru', style: const TextStyle(fontWeight: FontWeight.w800)),
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
      ),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 120), children: [
        if (_error.isNotEmpty) ErrorBox(_error),
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const FormLabel('Pilih Kelas'),
            SelectField(value: _class?.name, placeholder: '-- Kelas --', onTap: _editing ? () {} : _pickClass),
            const FormLabel('Mata Pelajaran'),
            SelectField(
              value: _subject?.name,
              placeholder: '-- Mapel --',
              onTap: _editing
                  ? () {}
                  : () async {
                      final s = await showSelectorSheet(context, title: 'Pilih Mata Pelajaran', items: widget.form.subjects, selectedId: _subject?.id);
                      if (s != null) setState(() => _subject = s);
                    },
            ),
            const FormLabel('Jenis Penilaian'),
            SelectField(
              value: _type,
              placeholder: '',
              onTap: () async {
                final t = await showSelectorSheet(
                  context,
                  title: 'Jenis Penilaian',
                  items: [for (var i = 0; i < types.length; i++) SimpleItem(i, types[i])],
                  selectedId: types.indexOf(_type),
                );
                if (t != null) setState(() => _type = t.name);
              },
            ),
            const FormLabel('Tanggal'),
            DateField(value: _date, onChanged: (v) => setState(() => _date = v)),
            const FormLabel('Judul / Deskripsi'),
            TextField(controller: _title, decoration: const InputDecoration(hintText: 'Contoh: UH Bab 3 - Trigonometri')),
            const FormLabel('KKM (Opsional)'),
            TextField(controller: _kkm, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: '75')),
          ]),
        ),
        if (_scores.isNotEmpty)
          AppCard(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('INPUT NILAI SISWA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: .6, color: AppColors.onSurfaceVariant)),
              const SizedBox(height: 10),
              for (var i = 0; i < _scores.length; i++)
                Container(
                  color: i.isOdd ? AppColors.surfaceLow : null,
                  padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 6),
                  child: Row(children: [
                    SizedBox(width: 26, child: Text('${i + 1}', style: const TextStyle(fontSize: 12, color: AppColors.outline))),
                    Expanded(child: Text(_scores[i].name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
                    SizedBox(
                      width: 84,
                      child: TextField(
                        controller: _scores[i].ctrl,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        textAlign: TextAlign.center,
                        decoration: const InputDecoration(hintText: '0-100', isDense: true, contentPadding: EdgeInsets.symmetric(vertical: 10)),
                      ),
                    ),
                  ]),
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
            label: const Text('Simpan Penilaian'),
          ),
        ),
      ),
    );
  }
}
