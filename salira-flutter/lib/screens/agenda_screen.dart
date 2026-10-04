import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../models/models.dart';
import '../services/api_services.dart';

const _statuses = ['Hadir', 'Sakit', 'Izin', 'Alpha'];

const _jpSchedule = [
  (1, '07:30 - 08:05'),
  (2, '08:05 - 08:40'),
  (3, '08:40 - 09:15'),
  (4, '09:15 - 09:50'),
  (5, '10:10 - 10:45'),
  (6, '10:45 - 11:20'),
  (7, '11:20 - 11:55'),
  (8, '13:15 - 13:50'),
  (9, '13:50 - 14:25'),
];

Color _statusFg(String s) => switch (s) {
      'Hadir' => AppColors.secondary,
      'Sakit' => AppColors.tertiary,
      'Izin' => AppColors.primary,
      _ => AppColors.error,
    };

class AgendaScreen extends StatefulWidget {
  const AgendaScreen({super.key});

  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  List<Agenda> _agendas = [];
  AgendaFormData _form = const AgendaFormData([], []);
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    AgendaService.formData().then((f) {
      if (mounted) setState(() => _form = f);
    }).catchError((_) {});
  }

  Future<void> _load() async {
    try {
      final a = await AgendaService.getAll();
      if (mounted) setState(() => _agendas = a);
    } catch (_) {
      // abaikan
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openForm() async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(fullscreenDialog: true, builder: (_) => _AgendaForm(form: _form)),
    );
    if (saved == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final totalJp = _agendas.fold<int>(0, (s, a) => s + (a.lessonHourEnd - a.lessonHourStart + 1));
    final classes = _agendas.map((a) => a.academicClassId).toSet().length;

    return Scaffold(
      backgroundColor: AppColors.surface,
      body: Column(children: [
        TabHeader(title: 'Jurnal Mengajar', actionLabel: 'Buat Jurnal', onAction: _openForm),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
              children: [
                GradientBanner(
                  tag: 'GURU MAPEL',
                  title: 'Jurnal KBM',
                  desc: 'Catat agenda dan aktivitas mengajar harian secara praktis.',
                  stats: [
                    BannerStat('Total Jurnal', '${_agendas.length}'),
                    BannerStat('Kelas Aktif', '$classes', AppColors.tertiaryFixed),
                    BannerStat('Total JP', '$totalJp', AppColors.secondaryContainer),
                  ],
                ),
                const SizedBox(height: 14),
                if (_loading)
                  const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()))
                else if (_agendas.isEmpty)
                  const EmptyState(icon: Icons.menu_book, title: 'Belum ada jurnal', text: 'Tap tombol Buat Jurnal untuk mencatat jurnal mengajar hari ini.')
                else
                  for (final a in _agendas)
                    AppCard(
                      accent: AppColors.primary,
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          Text(a.date, style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: AppColors.primaryFixed, borderRadius: BorderRadius.circular(8)),
                            child: Text('JP ${a.lessonHourStart}–${a.lessonHourEnd}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.onPrimaryFixedVariant)),
                          ),
                        ]),
                        const SizedBox(height: 6),
                        Text(a.topic, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                        Text('${a.className ?? '-'} · ${a.subjectName ?? '-'}', style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
                        if (a.notes != null && a.notes!.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(a.notes!, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppColors.outline)),
                        ],
                      ]),
                    ),
              ],
            ),
          ),
        ),
      ]),
    );
  }
}

// ─── Form buat jurnal + presensi siswa ────────────────────────
class _AgendaForm extends StatefulWidget {
  final AgendaFormData form;
  const _AgendaForm({required this.form});

  @override
  State<_AgendaForm> createState() => _AgendaFormState();
}

class _AgendaFormState extends State<_AgendaForm> {
  SimpleItem? _class;
  SimpleItem? _subject;
  String _date = todayIso();
  final Set<int> _jps = {};
  final _topic = TextEditingController();
  final _media = TextEditingController();
  final _notes = TextEditingController();

  List<Student> _students = [];
  final Map<int, String> _status = {};
  bool _loadingStudents = false;
  bool _submitting = false;
  String _error = '';

  @override
  void dispose() {
    _topic.dispose();
    _media.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickClass() async {
    final c = await showSelectorSheet(context, title: 'Pilih Kelas', items: widget.form.classes, selectedId: _class?.id);
    if (c == null) return;
    setState(() {
      _class = c;
      _students = [];
      _status.clear();
      _loadingStudents = true;
    });
    try {
      final s = await AssessmentService.students(c.id);
      setState(() {
        _students = s;
        for (final st in s) {
          _status[st.id] = 'Hadir';
        }
      });
    } catch (e) {
      setState(() => _error = 'Gagal memuat siswa: ${errorMessage(e)}');
    } finally {
      if (mounted) setState(() => _loadingStudents = false);
    }
  }

  Future<void> _pickSubject() async {
    final s = await showSelectorSheet(context, title: 'Pilih Mata Pelajaran', items: widget.form.subjects, selectedId: _subject?.id);
    if (s != null) setState(() => _subject = s);
  }

  Future<void> _submit() async {
    if (_class == null || _subject == null || _topic.text.trim().isEmpty) {
      setState(() => _error = 'Kelas, mata pelajaran, tanggal, dan topik harus diisi');
      return;
    }
    if (_jps.isEmpty) {
      setState(() => _error = 'Pilih setidaknya satu jam pelajaran (JP)');
      return;
    }
    setState(() {
      _submitting = true;
      _error = '';
    });
    try {
      final media = _media.text.trim();
      final notes = _notes.text.trim();
      final combined = media.isNotEmpty ? 'Media: $media\nCatatan: $notes' : notes;
      final sorted = _jps.toList()..sort();
      await AgendaService.create({
        'academic_class_id': _class!.id,
        'subject_id': _subject!.id,
        'date': _date,
        'lesson_hour_start': sorted.first,
        'lesson_hour_end': sorted.last,
        'topic': _topic.text.trim(),
        if (combined.isNotEmpty) 'notes': combined,
        if (_students.isNotEmpty)
          'attendances': [
            for (final s in _students) {'student_id': s.id, 'status': (_status[s.id] ?? 'Hadir').toLowerCase()},
          ],
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => _error = errorMessage(e, 'Gagal menyimpan jurnal'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    int count(String s) => _status.values.where((v) => v == s).length;

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Text('Buat Jurnal Baru', style: TextStyle(fontWeight: FontWeight.w800)),
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
      ),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 120), children: [
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Informasi Pembelajaran', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
            const Text('Detail kurikulum & rencana harian', style: TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 8),
            if (_error.isNotEmpty) ErrorBox(_error),
            const FormLabel('Pilih Kelas', required: true),
            SelectField(value: _class?.name, placeholder: '-- Pilih Kelas --', onTap: _pickClass),
            const FormLabel('Tanggal KBM', required: true),
            DateField(value: _date, onChanged: (v) => setState(() => _date = v)),
            const FormLabel('Mata Pelajaran', required: true),
            SelectField(value: _subject?.name, placeholder: '-- Pilih Mata Pelajaran --', onTap: _pickSubject),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const FormLabel('Jam Pelajaran Aktif', required: true),
              Text('${_jps.length} Jam Terpilih', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary)),
            ]),
            GridView.count(
              crossAxisCount: 3, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 1.7,
              children: [
                for (final (jp, time) in _jpSchedule)
                  InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => setState(() => _jps.contains(jp) ? _jps.remove(jp) : _jps.add(jp)),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: _jps.contains(jp) ? AppColors.primary : AppColors.surfaceLow,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: _jps.contains(jp) ? AppColors.primary : AppColors.outlineVariant),
                      ),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          Text('Jam $jp', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: _jps.contains(jp) ? Colors.white : AppColors.onSurface)),
                          Icon(_jps.contains(jp) ? Icons.check_circle : Icons.radio_button_unchecked, size: 15, color: _jps.contains(jp) ? Colors.white : AppColors.outlineVariant),
                        ]),
                        Text(time, style: TextStyle(fontSize: 10, color: _jps.contains(jp) ? AppColors.primaryFixed : AppColors.onSurfaceVariant)),
                      ]),
                    ),
                  ),
              ],
            ),
            const FormLabel('Tujuan Pembelajaran Hari Ini', required: true),
            TextField(controller: _topic, maxLines: 3, decoration: const InputDecoration(hintText: 'Apa tujuan pembelajaran hari ini?')),
            const FormLabel('Model & Media Pembelajaran'),
            TextField(controller: _media, maxLines: 3, decoration: const InputDecoration(hintText: 'Tuliskan model dan media pembelajaran yang digunakan...')),
            const FormLabel('Catatan & Perkembangan Siswa (Opsional)'),
            TextField(controller: _notes, maxLines: 3, decoration: const InputDecoration(hintText: 'Catatan adab santri, kendala praktikum lab, atau santri berprestasi...')),
          ]),
        ),
        if (_class != null)
          AppCard(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Presensi Siswa', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                    Text('Roster Kehadiran ${_class!.name}', style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant)),
                  ]),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.surfaceContainer, borderRadius: BorderRadius.circular(99)),
                  child: Text('${_students.length} Siswa', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: Text('${count('Hadir')} Hadir, ${count('Sakit')} Sakit, ${count('Izin')} Izin, ${count('Alpha')} Alpha', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                FilledButton.icon(
                  onPressed: () => setState(() {
                    for (final s in _students) {
                      _status[s.id] = 'Hadir';
                    }
                  }),
                  icon: const Icon(Icons.done_all, size: 14),
                  label: const Text('Semua Hadir', style: TextStyle(fontSize: 11)),
                  style: FilledButton.styleFrom(backgroundColor: AppColors.secondary, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                ),
              ]),
              const SizedBox(height: 8),
              if (_loadingStudents)
                const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator()))
              else if (_students.isEmpty)
                const Padding(padding: EdgeInsets.all(20), child: Center(child: Text('Tidak ada siswa di kelas ini', style: TextStyle(color: AppColors.outline))))
              else
                for (var i = 0; i < _students.length; i++)
                  _studentRow(i, _students[i]),
            ]),
          ),
      ]),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: Row(children: [
            Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), child: const Text('Batal'))),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: FilledButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.task_alt, size: 20),
                label: const Text('Simpan Jurnal & Absensi'),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _studentRow(int idx, Student s) {
    final cur = _status[s.id] ?? 'Hadir';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: AppColors.surfaceLow, borderRadius: BorderRadius.circular(12)),
      child: Column(children: [
        Row(children: [
          CircleAvatar(radius: 12, backgroundColor: AppColors.surfaceHigh, child: Text('${idx + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700))),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              Text('NISN: ${s.nisn}', style: const TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant)),
            ]),
          ),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          for (final st in _statuses)
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _status[s.id] = st),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  padding: const EdgeInsets.symmetric(vertical: 7),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: cur == st ? _statusFg(st) : Colors.white, borderRadius: BorderRadius.circular(8)),
                  child: Text(st, style: TextStyle(fontSize: 11, fontWeight: cur == st ? FontWeight.w800 : FontWeight.w500, color: cur == st ? Colors.white : AppColors.onSurfaceVariant)),
                ),
              ),
            ),
        ]),
      ]),
    );
  }
}
