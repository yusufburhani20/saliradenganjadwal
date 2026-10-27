<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\AcademicClass;
use App\Models\AcademicYear;
use App\Models\Subject;
use App\Models\User;
use App\Models\TeachingAssignment;
use App\Models\Schedule;
use App\Models\Setting;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportAscTimetableSmk extends Command
{
    protected $signature = 'schedule:import-asc {file=111.xml} {--no-apply : Jangan terapkan ke tabel schedules resmi}';
    protected $description = 'Import Master Guru, Mapel, SKBM dan Jadwal dari aSc TimeTables XML khusus jenjang SMK';

    public function handle()
    {
        $filePath = $this->argument('file');
        if (!file_exists($filePath)) {
            $filePath = base_path($filePath);
        }

        if (!file_exists($filePath)) {
            $this->error("File XML tidak ditemukan di: {$filePath}");
            return 1;
        }

        $this->info("=== MEMULAI IMPORT DATA aSc TIMETABLES (SMK) ===");
        $this->info("Membaca file: {$filePath}");

        libxml_use_internal_errors(true);
        $xml = simplexml_load_file($filePath);
        if (!$xml) {
            $this->error("Gagal mem-parsing file XML.");
            return 1;
        }

        // 1. Tahun Ajaran Aktif
        $activeYear = AcademicYear::where('is_active', true)->first();
        if (!$activeYear) {
            $activeYear = AcademicYear::first();
        }
        $yearId = $activeYear ? $activeYear->id : 1;
        $this->info("Tahun Ajaran Aktif: " . ($activeYear ? $activeYear->name : "ID: {$yearId}"));

        // 2. Pastikan Role Guru tersedia
        $guruRole = Role::firstOrCreate(['name' => 'Guru']);

        // 3. Mapping data dasar XML
        $xmlClasses = [];
        foreach ($xml->classes->class as $c) {
            $xmlClasses[(string)$c['id']] = (string)$c['name'];
        }

        $xmlTeachers = [];
        foreach ($xml->teachers->teacher as $t) {
            $xmlTeachers[(string)$t['id']] = (string)$t['name'];
        }

        $xmlSubjects = [];
        $xmlSubjectCodes = [];
        foreach ($xml->subjects->subject as $s) {
            $xmlSubjects[(string)$s['id']] = (string)$s['name'];
            $xmlSubjectCodes[(string)$s['id']] = (string)$s['short'];
        }

        $xmlPeriods = [];
        foreach ($xml->periods->period as $p) {
            $pid = (string)$p['period'];
            $start = (string)$p['starttime'];
            $end = (string)$p['endtime'];
            // Normalize HH:MM
            if (strlen($start) === 4 && $start[1] === ':') $start = '0' . $start;
            if (strlen($end) === 4 && $end[1] === ':') $end = '0' . $end;
            $xmlPeriods[$pid] = ['start' => $start, 'end' => $end];
        }

        $daysMap = [
            '100000' => 'saturday',
            '010000' => 'sunday',
            '001000' => 'monday',
            '000100' => 'tuesday',
            '000010' => 'wednesday',
            '000001' => 'thursday',
        ];

        // 4. Identifikasi Kelas SMK di XML
        $smkXmlClassIds = [];
        foreach ($xmlClasses as $cid => $cname) {
            if (str_contains($cname, 'AKL') || str_contains($cname, 'TJKT')) {
                $smkXmlClassIds[$cid] = $cname;
            }
        }

        $this->info("Ditemukan " . count($smkXmlClassIds) . " kelas SMK di XML: " . implode(', ', $smkXmlClassIds));

        // 5. Pemetaan ke AcademicClass di Database SALIRA
        $classDbMap = []; // xml_class_id => AcademicClass
        $classAliasMap = [
            'IV AKL'  => ['X AKL PA', 'X AKL', 'IV AKL'],
            'IV TJKT' => ['X TJKT PA', 'X TJKT', 'IV TJKT'],
            'V AKL'   => ['XI AKL PA', 'XI AKL', 'V AKL'],
            'V TJKT'  => ['XI TJKT', 'XI TJKT PA', 'V TJKT'],
            'VI AKL'  => ['XII AKL PA', 'XII AKL', 'VI AKL'],
            'VI TJKT' => ['XII TJKT', 'XII TJKT PA', 'VI TJKT'],
        ];

        foreach ($smkXmlClassIds as $xmlCid => $xmlCname) {
            $targetAliases = $classAliasMap[$xmlCname] ?? [$xmlCname];
            $dbClass = null;
            foreach ($targetAliases as $alias) {
                $dbClass = AcademicClass::withoutGlobalScopes()->where('name', $alias)->first();
                if ($dbClass) break;
            }

            if (!$dbClass) {
                // Buat kelas jika belum ada
                $newName = $targetAliases[0];
                $dbClass = AcademicClass::create([
                    'name' => $newName,
                    'academic_year_id' => $yearId,
                ]);
                $this->info("Membuat Kelas Baru di DB: {$newName}");
            }

            $classDbMap[$xmlCid] = $dbClass;
            $this->line("  - XML '{$xmlCname}' ➔ DB ID: {$dbClass->id} ('{$dbClass->name}')");
        }

        // 6. Filter Lesson SMK
        $xmlLessons = [];
        $smkLessons = [];
        $smkTeacherXmlIds = [];
        $smkSubjectXmlIds = [];

        foreach ($xml->lessons->lesson as $l) {
            $lid = (string)$l['id'];
            $xmlLessons[$lid] = $l;

            $cids = array_filter(explode(',', (string)$l['classids']));
            $hasSmk = false;
            foreach ($cids as $cid) {
                if (isset($smkXmlClassIds[$cid])) {
                    $hasSmk = true;
                    break;
                }
            }

            if ($hasSmk) {
                $smkLessons[$lid] = $l;
                foreach (array_filter(explode(',', (string)$l['teacherids'])) as $tid) {
                    $smkTeacherXmlIds[$tid] = true;
                }
                $subId = (string)$l['subjectid'];
                if ($subId) {
                    $smkSubjectXmlIds[$subId] = true;
                }
            }
        }

        $this->info("\nDitemukan " . count($smkLessons) . " alokasi mengajar (SKBM) SMK.");
        $this->info("Jumlah Guru Pengampu SMK: " . count($smkTeacherXmlIds));
        $this->info("Jumlah Mata Pelajaran SMK: " . count($smkSubjectXmlIds));

        // 7. Sinkronisasi Guru ke Users
        $this->info("\n--- Menyinkronkan Guru ke Akun Users ---");
        $teacherDbMap = []; // xml_tid => User
        $existingUsersByName = User::all()->keyBy(fn($u) => strtolower(trim($u->name)));

        $emailCounter = 1;
        foreach (array_keys($smkTeacherXmlIds) as $xmlTid) {
            $tName = $xmlTeachers[$xmlTid] ?? "Guru {$xmlTid}";
            $cleanName = trim($tName);
            $lowerName = strtolower($cleanName);

            // Cek nama eksisting atau nama pendek
            $user = $existingUsersByName->get($lowerName);
            if (!$user) {
                // Cek awalan nama (misal "Yusuf Burhani" dari "Yusuf Burhani, S.Pd., S.Kom.")
                $nameParts = explode(',', $cleanName);
                $firstNamePart = strtolower(trim($nameParts[0]));
                foreach ($existingUsersByName as $existingLowerName => $eu) {
                    if (str_contains($existingLowerName, $firstNamePart) || str_contains($firstNamePart, $existingLowerName)) {
                        $user = $eu;
                        break;
                    }
                }
            }

            if (!$user) {
                // Buat user guru baru
                $slug = Str::slug(explode(',', $cleanName)[0], '');
                if (empty($slug)) $slug = 'guru' . $emailCounter++;
                $email = $slug . '@salira.sch.id';

                // Pastikan email unik
                $baseEmail = $slug;
                $idx = 1;
                while (User::where('email', $email)->exists()) {
                    $email = "{$baseEmail}{$idx}@salira.sch.id";
                    $idx++;
                }

                $user = User::create([
                    'name' => $cleanName,
                    'email' => $email,
                    'password' => Hash::make('password'),
                    'status' => 'active',
                    'email_verified_at' => now(),
                ]);
                $this->line("  + Dibuat Akun Guru: {$cleanName} ({$email})");
            } else {
                $this->line("  ✓ Guru Sudah Terdaftar: {$cleanName}");
            }

            // Berikan role Guru
            if (!$user->hasRole('Guru')) {
                $user->assignRole('Guru');
            }

            $teacherDbMap[$xmlTid] = $user;
        }

        // 8. Sinkronisasi Mata Pelajaran
        $this->info("\n--- Menyinkronkan Mata Pelajaran ---");
        $subjectDbMap = []; // xml_subid => Subject
        $existingSubjects = Subject::all()->keyBy(fn($s) => strtolower(trim($s->name)));

        foreach (array_keys($smkSubjectXmlIds) as $xmlSubId) {
            $subName = trim($xmlSubjects[$xmlSubId] ?? "Mapel {$xmlSubId}");
            $lowerSub = strtolower($subName);
            $subCode = $xmlSubjectCodes[$xmlSubId] ?? strtoupper(substr(Str::slug($subName, ''), 0, 6));

            $subject = $existingSubjects->get($lowerSub);
            if (!$subject) {
                // Pastikan kode unik
                $code = $subCode;
                $cIdx = 1;
                while (Subject::where('code', $code)->exists()) {
                    $code = "{$subCode}{$cIdx}";
                    $cIdx++;
                }

                $subject = Subject::create([
                    'name' => $subName,
                    'code' => $code,
                ]);
                $this->line("  + Dibuat Mapel: {$subName} [{$code}]");
            } else {
                $this->line("  ✓ Mapel Ditemukan: {$subName}");
            }

            $subjectDbMap[$xmlSubId] = $subject;
        }

        // 9. Hitung Total JP dan Simpan ke teaching_assignments
        $this->info("\n--- Mengimpor Alokasi Mengajar (SKBM) ---");
        $assignmentHours = []; // key: "classDbId_subjectDbId_teacherDbId" => hours
        $assignmentAllowedDays = [];

        // Hitung jam dari cards yang terdistribusi untuk kelas SMK
        $cardsByGroup = [];
        $smkClassDbIds = array_map(fn($c) => $c->id, $classDbMap);

        foreach ($xml->cards->card as $card) {
            $lid = (string)$card['lessonid'];
            if (!isset($smkLessons[$lid])) continue;

            $l = $smkLessons[$lid];
            $dayCode = (string)$card['days'];
            $dayName = $daysMap[$dayCode] ?? 'monday';
            $period = (int)$card['period'];

            $cids = array_filter(explode(',', (string)$l['classids']));
            $tids = array_filter(explode(',', (string)$l['teacherids']));
            $subXmlId = (string)$l['subjectid'];

            foreach ($cids as $xmlCid) {
                if (!isset($classDbMap[$xmlCid])) continue;
                $dbClass = $classDbMap[$xmlCid];
                $dbSubject = $subjectDbMap[$subXmlId] ?? null;
                if (!$dbSubject) continue;

                foreach ($tids as $xmlTid) {
                    $dbTeacher = $teacherDbMap[$xmlTid] ?? null;
                    if (!$dbTeacher) continue;

                    $key = "{$dbClass->id}_{$dbSubject->id}_{$dbTeacher->id}";
                    $assignmentHours[$key] = ($assignmentHours[$key] ?? 0) + 1;

                    // Grouping untuk jadwal resmi (Schedule)
                    $groupKey = "{$dbClass->id}_{$dbSubject->name}_{$dbTeacher->id}_{$dayName}";
                    $cardsByGroup[$groupKey][] = $period;
                }
            }
        }

        // Simpan Alokasi ke tabel teaching_assignments
        $assignmentCount = 0;
        foreach ($assignmentHours as $key => $hours) {
            [$classId, $subjectId, $teacherId] = explode('_', $key);

            TeachingAssignment::updateOrCreate(
                [
                    'academic_class_id' => $classId,
                    'subject_id' => $subjectId,
                ],
                [
                    'teacher_id' => $teacherId,
                    'total_hours' => $hours,
                    'max_hours_per_day' => min(3, $hours),
                ]
            );

            // Hubungkan juga ke academic_class_subject pivot
            $class = AcademicClass::withoutGlobalScopes()->find($classId);
            if ($class) {
                $class->subjects()->syncWithoutDetaching([$subjectId]);
            }

            $assignmentCount++;
        }

        $this->info("Berhasil mengimpor {$assignmentCount} alokasi mengajar guru (SKBM).");

        // 10. Terapkan ke Tabel Resmi Schedules (Jadwal Terpasang)
        if (!$this->option('no-apply')) {
            $this->info("\n--- Mengimpor Jadwal Resmi ke Tabel Schedules ---");

            // Hapus jadwal lama untuk kelas SMK ini agar tidak duplikat
            Schedule::whereIn('class_id', $smkClassDbIds)->delete();

            $scheduleCount = 0;
            foreach ($cardsByGroup as $groupKey => $periods) {
                [$classId, $subjectName, $teacherId, $dayName] = explode('_', $groupKey, 4);
                sort($periods);

                // Gabungkan jam berurutan menjadi 1 blok pertemuan
                $chunks = [];
                $cur = [$periods[0]];
                for ($i = 1; $i < count($periods); $i++) {
                    if ($periods[$i] === end($cur) + 1) {
                        $cur[] = $periods[$i];
                    } else {
                        $chunks[] = $cur;
                        $cur = [$periods[$i]];
                    }
                }
                $chunks[] = $cur;

                foreach ($chunks as $chunk) {
                    $startP = (string)$chunk[0];
                    $endP = (string)end($chunk);

                    $startTime = ($xmlPeriods[$startP]['start'] ?? '07:30') . ':00';
                    $endTime = ($xmlPeriods[$endP]['end'] ?? '08:50') . ':00';

                    Schedule::create([
                        'class_id' => $classId,
                        'teacher_id' => $teacherId,
                        'subject' => $subjectName,
                        'day' => $dayName,
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                    ]);
                    $scheduleCount++;
                }
            }

            $this->info("Berhasil mengimpor {$scheduleCount} blok jadwal resmi (Schedule) langsung dari aSc TimeTables.");
        }

        // 11. Perbarui Setting Jam Belajar Sekolah (lesson_hours_by_day)
        $this->info("\n--- Mengonfigurasi Setting Jam Pelajaran (Periods) ---");
        $lessonHoursConfig = [];
        $daysList = ['monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'];

        foreach ($daysList as $d) {
            $slots = [];
            foreach ($xmlPeriods as $pNum => $times) {
                $slots[] = [
                    'label' => "Jam ke-{$pNum}",
                    'start' => $times['start'],
                    'end' => $times['end'],
                ];
            }
            $lessonHoursConfig[$d] = $slots;
        }
        $lessonHoursConfig['friday'] = []; // Libur KBM

        Setting::set('lesson_hours_by_day', json_encode($lessonHoursConfig));
        $this->info("Setting 'lesson_hours_by_day' telah disinkronkan dengan 9 jam pelajaran aSc.");

        $this->info("\n========================================================");
        $this->info("✅ PROSES IMPORT aSc TIMETABLES SMK SELESAI DENGAN SUKSES!");
        $this->info("========================================================");

        return 0;
    }
}
