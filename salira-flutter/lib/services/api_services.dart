import 'package:dio/dio.dart';
import 'package:cross_file/cross_file.dart';

import '../core/api_client.dart';
import '../models/models.dart';

Dio get _dio => ApiClient.instance.dio;

List<Map<String, dynamic>> _list(dynamic v) => (v as List? ?? [])
    .whereType<Map>()
    .map((e) => Map<String, dynamic>.from(e))
    .toList();

List<SimpleItem> _items(dynamic v) =>
    _list(v).map(SimpleItem.fromJson).toList();

// ─── Auth ────────────────────────────────────────────────────
class AuthService {
  static Future<({String token, User user})> login(
      String identifier, String password) async {
    final res = await _dio
        .post('/login', data: {'identifier': identifier, 'password': password});
    return (
      token: '${res.data['access_token']}',
      user: User.fromJson(Map<String, dynamic>.from(res.data['user'])),
    );
  }

  static Future<User> me() async {
    final res = await _dio.get('/me');
    return User.fromJson(Map<String, dynamic>.from(res.data['data']));
  }

  static Future<void> logout() => _dio.post('/logout');
}

// ─── Presensi ────────────────────────────────────────────────
class AttendancePage {
  final List<AttendanceData> data;
  final int currentPage;
  final int lastPage;
  const AttendancePage(this.data, this.currentPage, this.lastPage);
}

class AttendanceService {
  static Future<AttendanceData?> today() async {
    final res = await _dio.get('/attendance/today');
    final d = res.data['data'];
    return d == null ? null : AttendanceData.fromJson(Map<String, dynamic>.from(d));
  }

  static Future<AttendancePage> history([int page = 1]) async {
    final res = await _dio.get('/attendance', queryParameters: {'page': page});
    final meta = res.data['meta'] ?? {};
    return AttendancePage(
      _list(res.data['data']).map(AttendanceData.fromJson).toList(),
      int.tryParse('${meta['current_page']}') ?? 1,
      int.tryParse('${meta['last_page']}') ?? 1,
    );
  }

  static Future<void> checkIn({
    double? latitude,
    double? longitude,
    String? notes,
    XFile? photo,
  }) async {
    final form = FormData();
    if (latitude != null) form.fields.add(MapEntry('latitude', '$latitude'));
    if (longitude != null) form.fields.add(MapEntry('longitude', '$longitude'));
    if (notes != null && notes.isNotEmpty) {
      form.fields.add(MapEntry('notes', notes));
    }
    if (photo != null) {
      form.files.add(MapEntry(
        'photo',
        MultipartFile.fromBytes(await photo.readAsBytes(), filename: photo.name),
      ));
    }
    await _dio.post('/attendance/check-in',
        data: form, options: Options(contentType: 'multipart/form-data'));
  }
}

// ─── Perizinan ───────────────────────────────────────────────
class LeaveService {
  static Future<List<Leave>> getAll() async {
    final res = await _dio.get('/leaves');
    return _list(res.data['data']).map(Leave.fromJson).toList();
  }

  static Future<void> create({
    required String type,
    required String startDate,
    required String endDate,
    required String reason,
  }) =>
      _dio.post('/leaves', data: {
        'type': type,
        'start_date': startDate,
        'end_date': endDate,
        'reason': reason,
      });

  static Future<void> delete(int id) => _dio.delete('/leaves/$id');
}

// ─── Jurnal / Agenda ─────────────────────────────────────────
class AgendaFormData {
  final List<SimpleItem> classes;
  final List<SimpleItem> subjects;
  const AgendaFormData(this.classes, this.subjects);
}

class AgendaService {
  static Future<List<Agenda>> getAll() async {
    final res = await _dio.get('/agendas');
    return _list(res.data['data']).map(Agenda.fromJson).toList();
  }

  static Future<AgendaFormData> formData() async {
    final res = await _dio.get('/agendas/form-data');
    return AgendaFormData(_items(res.data['classes']), _items(res.data['subjects']));
  }

  static Future<void> create(Map<String, dynamic> payload) =>
      _dio.post('/agendas', data: payload);

  static Future<void> delete(int id) => _dio.delete('/agendas/$id');
}

// ─── Penilaian Harian ────────────────────────────────────────
class AssessmentService {
  static Future<List<Assessment>> getAll() async {
    final res = await _dio.get('/assessments');
    return _list(res.data['data']).map(Assessment.fromJson).toList();
  }

  static Future<AgendaFormData> formData() async {
    final res = await _dio.get('/assessments/form-data');
    return AgendaFormData(_items(res.data['classes']), _items(res.data['subjects']));
  }

  static Future<List<Student>> students(int classId) async {
    final res = await _dio.get('/assessments/students/$classId');
    return _list(res.data['data']).map(Student.fromJson).toList();
  }

  static Future<void> create(Map<String, dynamic> payload) =>
      _dio.post('/assessments', data: payload);

  static Future<void> delete(int id) => _dio.delete('/assessments/$id');
}

// ─── Ujian Akhir (ASAS / ASAT) ───────────────────────────────
class FinalAssessmentService {
  static Future<List<Assessment>> getAll() async {
    final res = await _dio.get('/final-assessments');
    return _list(res.data['data']).map(Assessment.fromJson).toList();
  }

  static Future<void> create(Map<String, dynamic> payload) =>
      _dio.post('/final-assessments', data: payload);

  static Future<void> update(int id, Map<String, dynamic> payload) =>
      _dio.put('/final-assessments/$id', data: payload);

  static Future<void> delete(int id) => _dio.delete('/final-assessments/$id');
}

// ─── Bimbingan / Konsultasi ──────────────────────────────────
class ConsultationFormData {
  final List<SimpleItem> classes;
  final List<String> categories;
  final List<String> followUpStatuses;
  const ConsultationFormData(this.classes, this.categories, this.followUpStatuses);
}

class ConsultationService {
  static Future<List<Consultation>> getAll() async {
    final res = await _dio.get('/consultations');
    return _list(res.data['data']).map(Consultation.fromJson).toList();
  }

  static Future<ConsultationFormData> formData() async {
    final res = await _dio.get('/consultations/form-data');
    return ConsultationFormData(
      _items(res.data['classes']),
      (res.data['categories'] as List? ?? []).map((e) => '$e').toList(),
      (res.data['follow_up_statuses'] as List? ?? []).map((e) => '$e').toList(),
    );
  }

  static Future<List<Student>> students(int classId) async {
    final res = await _dio.get('/consultations/students/$classId');
    return _list(res.data['data']).map(Student.fromJson).toList();
  }

  static Future<void> create(Map<String, dynamic> payload) =>
      _dio.post('/consultations', data: payload);
}

// ─── Belajar Malam ───────────────────────────────────────────
class EveningAttendanceRow {
  final int studentId;
  final String name;
  String status;
  String notes;
  EveningAttendanceRow({
    required this.studentId,
    required this.name,
    this.status = 'hadir',
    this.notes = '',
  });
}

class EveningStudyService {
  static Future<List<EveningItem>> getAll() async {
    final res = await _dio.get('/evening-studies');
    return _list(res.data['data']).map(EveningItem.fromJson).toList();
  }

  static Future<List<SimpleItem>> classes() async {
    final res = await _dio.get('/evening-studies/form-data');
    return _items(res.data['classes']);
  }

  static Future<List<Student>> students(int classId) async {
    final res = await _dio.get('/evening-studies/students/$classId');
    return _list(res.data['data']).map(Student.fromJson).toList();
  }

  static Future<List<EveningAttendanceRow>> detailAttendance(int id) async {
    final res = await _dio.get('/evening-studies/$id');
    return _list(res.data['data']?['attendance'])
        .map((a) => EveningAttendanceRow(
              studentId: int.tryParse('${a['student_id']}') ?? 0,
              name: '${a['student_name'] ?? ''}',
              status: '${a['status'] ?? 'hadir'}',
              notes: '${a['notes'] ?? ''}',
            ))
        .toList();
  }

  static Future<void> create(Map<String, dynamic> payload) =>
      _dio.post('/evening-studies', data: payload);

  static Future<void> update(int id, Map<String, dynamic> payload) =>
      _dio.put('/evening-studies/$id', data: payload);

  static Future<void> delete(int id) => _dio.delete('/evening-studies/$id');
}

// ─── Notifikasi ──────────────────────────────────────────────
class NotificationPage {
  final List<AppNotification> data;
  final int unreadCount;
  const NotificationPage(this.data, this.unreadCount);
}

class NotificationService {
  static Future<NotificationPage> getAll([int page = 1]) async {
    final res = await _dio.get('/notifications', queryParameters: {'page': page});
    return NotificationPage(
      _list(res.data['data']).map(AppNotification.fromJson).toList(),
      int.tryParse('${res.data['unread_count']}') ?? 0,
    );
  }

  static Future<void> markAsRead(String id) => _dio.post('/notifications/$id/read');
  static Future<void> markAllAsRead() => _dio.post('/notifications/read-all');
}
