// Model data - padanan dari `src/types/index.ts` & `types/attendance.ts`.

int _int(dynamic v, [int fallback = 0]) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse('$v') ?? fallback;
}

double? _dbl(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  return double.tryParse('$v');
}

String? _str(dynamic v) => v == null ? null : '$v';

/// Item generik untuk dropdown (kelas, mapel, siswa, dll).
class SimpleItem {
  final int id;
  final String name;
  const SimpleItem(this.id, this.name);

  factory SimpleItem.fromJson(Map<String, dynamic> j) =>
      SimpleItem(_int(j['id']), '${j['name'] ?? ''}');
}

class User {
  final int id;
  final String name;
  final String email;
  final String? nip;
  final String? phone;
  final String status;
  final List<String> roles;

  const User({
    required this.id,
    required this.name,
    required this.email,
    this.nip,
    this.phone,
    required this.status,
    required this.roles,
  });

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: _int(j['id']),
        name: '${j['name'] ?? ''}',
        email: '${j['email'] ?? ''}',
        nip: _str(j['nip']),
        phone: _str(j['phone']),
        status: '${j['status'] ?? ''}',
        roles: (j['roles'] as List? ?? []).map((e) => '$e').toList(),
      );
}

class Student {
  final int id;
  final String name;
  final String nisn;
  const Student(this.id, this.name, this.nisn);

  factory Student.fromJson(Map<String, dynamic> j) =>
      Student(_int(j['id']), '${j['name'] ?? ''}', '${j['nisn'] ?? ''}');
}

class AttendanceData {
  final int id;
  final String date;
  final String? checkIn;
  final String? checkOut;
  final String status;
  final String? notes;
  final String? verificationStatus;
  final String? latitude;
  final String? longitude;
  final String? photoUrl;

  const AttendanceData({
    required this.id,
    required this.date,
    this.checkIn,
    this.checkOut,
    required this.status,
    this.notes,
    this.verificationStatus,
    this.latitude,
    this.longitude,
    this.photoUrl,
  });

  factory AttendanceData.fromJson(Map<String, dynamic> j) => AttendanceData(
        id: _int(j['id']),
        date: '${j['date'] ?? ''}',
        checkIn: _str(j['check_in']),
        checkOut: _str(j['check_out']),
        status: '${j['status'] ?? ''}',
        notes: _str(j['notes']),
        verificationStatus: _str(j['verification_status']),
        latitude: _str(j['latitude']),
        longitude: _str(j['longitude']),
        photoUrl: _str(j['photo_url']),
      );
}

class Leave {
  final int id;
  final String type;
  final String startDate;
  final String endDate;
  final String reason;
  final String status;

  const Leave({
    required this.id,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.reason,
    required this.status,
  });

  factory Leave.fromJson(Map<String, dynamic> j) => Leave(
        id: _int(j['id']),
        type: '${j['type'] ?? ''}',
        startDate: '${j['start_date'] ?? ''}',
        endDate: '${j['end_date'] ?? ''}',
        reason: '${j['reason'] ?? ''}',
        status: '${j['status'] ?? 'pending'}',
      );
}

class Agenda {
  final int id;
  final String date;
  final String topic;
  final String? notes;
  final int lessonHourStart;
  final int lessonHourEnd;
  final String? className;
  final String? subjectName;
  final int academicClassId;

  const Agenda({
    required this.id,
    required this.date,
    required this.topic,
    this.notes,
    required this.lessonHourStart,
    required this.lessonHourEnd,
    this.className,
    this.subjectName,
    required this.academicClassId,
  });

  factory Agenda.fromJson(Map<String, dynamic> j) => Agenda(
        id: _int(j['id']),
        date: '${j['date'] ?? ''}',
        topic: '${j['topic'] ?? ''}',
        notes: _str(j['notes']),
        lessonHourStart: _int(j['lesson_hour_start']),
        lessonHourEnd: _int(j['lesson_hour_end']),
        className: _str(j['class_name']),
        subjectName: _str(j['subject_name']),
        academicClassId: _int(j['academic_class_id']),
      );
}

/// Dipakai untuk penilaian harian maupun ujian akhir (ASAS/ASAT).
class Assessment {
  final int id;
  final String date;
  final String title;
  final String type;
  final double? kkm;
  final String? className;
  final String? subjectName;
  final int academicClassId;
  final int subjectId;
  final int scoresCount;
  final double? averageScore;
  final List<Map<String, dynamic>> scores;

  const Assessment({
    required this.id,
    required this.date,
    required this.title,
    required this.type,
    this.kkm,
    this.className,
    this.subjectName,
    required this.academicClassId,
    required this.subjectId,
    required this.scoresCount,
    this.averageScore,
    this.scores = const [],
  });

  factory Assessment.fromJson(Map<String, dynamic> j) => Assessment(
        id: _int(j['id']),
        date: '${j['date'] ?? ''}',
        title: '${j['title'] ?? ''}',
        type: '${j['type'] ?? ''}',
        kkm: _dbl(j['kkm']),
        className: _str(j['class_name']),
        subjectName: _str(j['subject_name']),
        academicClassId: _int(j['academic_class_id']),
        subjectId: _int(j['subject_id']),
        scoresCount: _int(j['scores_count']),
        averageScore: _dbl(j['average_score']),
        scores: (j['scores'] as List? ?? [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList(),
      );
}

class Consultation {
  final int id;
  final String consultationDate;
  final String category;
  final String description;
  final String? followUp;
  final String? followUpStatus;
  final String? studentName;
  final int studentId;
  final String? className;
  final int academicClassId;

  const Consultation({
    required this.id,
    required this.consultationDate,
    required this.category,
    required this.description,
    this.followUp,
    this.followUpStatus,
    this.studentName,
    required this.studentId,
    this.className,
    required this.academicClassId,
  });

  factory Consultation.fromJson(Map<String, dynamic> j) => Consultation(
        id: _int(j['id']),
        consultationDate: '${j['consultation_date'] ?? ''}',
        category: '${j['category'] ?? ''}',
        description: '${j['description'] ?? ''}',
        followUp: _str(j['follow_up']),
        followUpStatus: _str(j['follow_up_status']),
        studentName: _str(j['student_name']),
        studentId: _int(j['student_id']),
        className: _str(j['class_name']),
        academicClassId: _int(j['academic_class_id']),
      );
}

class AppNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final String? url;
  final DateTime? readAt;
  final DateTime? createdAt;

  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.url,
    this.readAt,
    this.createdAt,
  });

  AppNotification markRead() => AppNotification(
        id: id,
        type: type,
        title: title,
        body: body,
        url: url,
        readAt: DateTime.now(),
        createdAt: createdAt,
      );

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: '${j['id']}',
        type: '${j['type'] ?? ''}',
        title: '${j['title'] ?? ''}',
        body: '${j['body'] ?? ''}',
        url: _str(j['url']),
        readAt: j['read_at'] == null ? null : DateTime.tryParse('${j['read_at']}'),
        createdAt:
            j['created_at'] == null ? null : DateTime.tryParse('${j['created_at']}'),
      );
}

class EveningItem {
  final int id;
  final String date;
  final String activityName;
  final String? notes;
  final String? className;
  final int hadirCount;
  final int alphaCount;
  final int totalStudents;

  const EveningItem({
    required this.id,
    required this.date,
    required this.activityName,
    this.notes,
    this.className,
    required this.hadirCount,
    required this.alphaCount,
    required this.totalStudents,
  });

  factory EveningItem.fromJson(Map<String, dynamic> j) => EveningItem(
        id: _int(j['id']),
        date: '${j['date'] ?? ''}',
        activityName: '${j['activity_name'] ?? ''}',
        notes: _str(j['notes']),
        className: _str(j['class_name']),
        hadirCount: _int(j['hadir_count']),
        alphaCount: _int(j['alpha_count']),
        totalStudents: _int(j['total_students']),
      );
}
